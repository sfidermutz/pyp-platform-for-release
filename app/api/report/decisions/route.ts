// app/api/report/decisions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/report/decisions
 * Query params:
 *   - scenario_id
 *   - session_id
 *   - is_final (true/false)
 *   - limit, offset
 *   - format=csv  (CSV export, protected by ADMIN_API_KEY)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const scenario_id = url.searchParams.get('scenario_id') ?? undefined;
    const session_id = url.searchParams.get('session_id') ?? undefined;
    const is_final_raw = url.searchParams.get('is_final');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 2000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
    const format = (url.searchParams.get('format') || '').toLowerCase();

    const is_final = (typeof is_final_raw === 'string') ? (is_final_raw.toLowerCase() === 'true') : true;

    // If CSV requested, require ADMIN_API_KEY
    if (format === 'csv') {
      const auth = checkAdminApiKey(req.headers);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
      }
    }

    let query = supabaseAdmin
      .from('decision_aggregates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scenario_id) query = query.eq('scenario_code', scenario_id);
    if (session_id) query = query.eq('session_id', session_id);
    if (typeof is_final === 'boolean') query = query.eq('is_final', is_final);

    const { data, error, count } = await query;

    if (error) {
      console.error('report/decisions query error', error);
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('relation') && msg.includes('does not exist')) {
        return NextResponse.json({ error: 'decision_aggregates view not found - run migrations' }, { status: 500 });
      }
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    if (format === 'csv') {
      // Build CSV: columns id,session_id,scenario_code,decision_point,selected_option_id,change_count,confidence,confidence_change_count,timestamps,created_at
      const rows = data ?? [];
      const csvHeader = [
        'id','session_id','scenario_code','decision_point','selected_option_id','change_count','confidence','confidence_change_count','selection_sequence','timestamps','is_final','created_at'
      ];
      const escape = (v: any) => {
        if (v === null || typeof v === 'undefined') return '';
        if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
        const s = String(v);
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const lines = [csvHeader.join(',')];
      for (const r of rows) {
        const seq = r.selection_sequence ?? r.details?.selection_sequence ?? null;
        const change_count = (r.change_count ?? r.details?.change_count) ?? null;
        const confidence_change_count = (r.confidence_change_count ?? r.details?.confidence_change_count) ?? null;
        const timestamps = r.timestamps ?? r.details?.timestamps ?? null;
        const is_final_val = r.is_final ?? (r.details?.is_final ?? false);
        const line = [
          escape(r.id),
          escape(r.session_id),
          escape(r.scenario_code),
          escape(r.decision_point),
          escape(r.selected_option_id),
          escape(change_count),
          escape(r.confidence),
          escape(confidence_change_count),
          escape(seq),
          escape(timestamps),
          escape(is_final_val),
          escape(r.created_at)
        ].join(',');
        lines.push(line);
      }
      const csv = lines.join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="decision_report_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({ rows: data ?? [], count: count ?? 0 });
  } catch (e: any) {
    console.error('report/decisions catch', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
