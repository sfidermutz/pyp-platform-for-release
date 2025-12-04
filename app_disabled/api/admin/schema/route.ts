// app/api/admin/schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * GET /api/admin/schema?tables=module_families,modules,...
 *
 * Header:
 *   x-api-key: <ADMIN_API_KEY>
 *
 * Returns:
 *  {
 *    columns: { tableName: [ { column_name, data_type, is_nullable, column_default }, ... ] },
 *    indexes: { tableName: [ { indexname, indexdef }, ... ] }
 *  }
 */
export async function GET(req: NextRequest) {
  try {
    // Admin auth
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'server not configured for DB access' }, { status: 500 });
    }

    const url = new URL(req.url);
    const tablesParam = url.searchParams.get('tables') ?? '';
    const tables = tablesParam ? tablesParam.split(',').map(s => s.trim()).filter(Boolean) : [
      'module_families','modules','tokens','sessions','decisions','reflections','scenario_metrics','certificates','debriefs'
    ];

    // Query information_schema.columns for the chosen tables
    const { data: cols, error: colErr } = await supabaseAdmin
      .from('information_schema.columns')
      .select('table_name,column_name,data_type,is_nullable,column_default,ordinal_position')
      .in('table_name', tables)
      .order('table_name', { ascending: true })
      .order('ordinal_position', { ascending: true });

    if (colErr) {
      console.error('schema: columns query error', colErr);
      return NextResponse.json({ error: 'columns query error', detail: String(colErr.message || colErr) }, { status: 500 });
    }

    // Query pg_indexes for the same tables (pg_indexes is typically accessible)
    const { data: idxs, error: idxErr } = await supabaseAdmin
      .from('pg_indexes')
      .select('tablename,indexname,indexdef')
      .in('tablename', tables)
      .order('tablename', { ascending: true });

    if (idxErr) {
      console.error('schema: indexes query error', idxErr);
      // return columns anyway and include index error
      return NextResponse.json({ columns: cols ?? [], indexes: {}, index_error: String(idxErr.message || idxErr) });
    }

    // Group columns/indexes by table
    const columnsByTable: Record<string, any[]> = {};
    for (const row of (cols ?? [])) {
      const t = row.table_name;
      if (!columnsByTable[t]) columnsByTable[t] = [];
      columnsByTable[t].push({
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable,
        column_default: row.column_default,
        ordinal_position: row.ordinal_position
      });
    }

    const indexesByTable: Record<string, any[]> = {};
    for (const r of (idxs ?? [])) {
      const t = r.tablename;
      if (!indexesByTable[t]) indexesByTable[t] = [];
      indexesByTable[t].push({ indexname: r.indexname, indexdef: r.indexdef });
    }

    return NextResponse.json({ columns: columnsByTable, indexes: indexesByTable });
  } catch (e: any) {
    console.error('schema route exception', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
