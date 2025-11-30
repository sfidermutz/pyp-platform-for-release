// app/api/admin/certificates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/admin/certificates
 * Headers: x-api-key required
 * Query: limit, offset, module, session_id, format=csv
 */
export async function GET(req: NextRequest) {
  try {
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 2000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
    const module = url.searchParams.get('module') ?? undefined;
    const session_id = url.searchParams.get('session_id') ?? undefined;
    const format = (url.searchParams.get('format') || '').toLowerCase();

    let query = supabaseAdmin
      .from('certificates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (module) query = query.eq('module', module);
    if (session_id) query = query.eq('session_id', session_id);

    const { data, error, count } = await query;
    if (error) {
      console.error('admin/certificates query error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    if (format === 'csv') {
      const rows = data ?? [];
      const escape = (v: any) => {
        if (v === null || typeof v === 'undefined') return '';
        if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
        const s = String(v);
        if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = ['id','session_id','module','verification_code','completed_on','valid_until','ects','module_lo','created_at'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const line = [
          escape(r.id),
          escape(r.session_id),
          escape(r.module),
          escape(r.verification_code),
          escape(r.completed_on),
          escape(r.valid_until),
          escape(r.ects),
          escape(r.module_lo),
          escape(r.created_at)
        ].join(',');
        lines.push(line);
      }
      const csv = lines.join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="certificates_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({ rows: data ?? [], count: count ?? 0 });
  } catch (e: any) {
    console.error('admin/certificates catch', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
