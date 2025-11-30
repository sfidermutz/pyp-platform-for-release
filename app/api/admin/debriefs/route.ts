// app/api/admin/debriefs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/admin/debriefs
 * Headers: x-api-key required (must match ADMIN_API_KEY)
 * Query params: limit, offset, scenario_id, session_id, format=csv
 */
export async function GET(req: NextRequest) {
  try {
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 2000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
    const scenario_id = url.searchParams.get('scenario_id') ?? undefined;
    const session_id = url.searchParams.get('session_id') ?? undefined;
    const format = (url.searchParams.get('format') || '').toLowerCase();

    let query = supabaseAdmin
      .from('debriefs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scenario_id) query = query.eq('scenario_id', scenario_id);
    if (session_id) query = query.eq('session_id', session_id);

    const { data, error, count } = await query;
    if (error) {
      console.error('admin/debriefs query error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    if (format === 'csv') {
      // Export as CSV: id, session_id, scenario_id, created_at, metrics JSON, reflection
      const rows = data ?? [];
      const escape = (v: any) => {
        if (v === null || typeof v === 'undefined') return '';
        if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
        const s = String(v);
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const header = ['id','session_id','scenario_id','created_at','metrics','short_feedback','reflection'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const line = [
          escape(r.id),
          escape(r.session_id),
          escape(r.scenario_id),
          escape(r.created_at),
          escape(r.metrics),
          escape(r.short_feedback),
          escape(r.reflection)
        ].join(',');
        lines.push(line);
      }
      const csv = lines.join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="debriefs_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({ rows: data ?? [], count: count ?? 0 });
  } catch (e: any) {
    console.error('admin/debriefs catch', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
