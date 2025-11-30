// app/api/report/decisions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env vars for report API');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/report/decisions
 *
 * Query params:
 *  - scenario_id (filters scenario_code)
 *  - session_id
 *  - is_final (true/false) default true
 *  - limit (int, default 50)
 *  - offset (int, default 0)
 *
 * Returns: { rows: [...], count: N }
 */
export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'server not configured (missing supabase env)' }, { status: 500 });
    }

    const url = new URL(req.url);
    const scenario_id = url.searchParams.get('scenario_id') ?? undefined;
    const session_id = url.searchParams.get('session_id') ?? undefined;
    const is_final_raw = url.searchParams.get('is_final');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

    // default: only final locked decisions
    const is_final = (typeof is_final_raw === 'string') ? (is_final_raw.toLowerCase() === 'true') : true;

    // Build query using Supabase RPC
    let query = supabaseAdmin
      .from('decision_aggregates')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (scenario_id) {
      query = query.eq('scenario_code', scenario_id);
    }
    if (session_id) {
      query = query.eq('session_id', session_id);
    }
    if (typeof is_final === 'boolean') {
      query = query.eq('is_final', is_final);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('report/decisions query error', error);
      // Helpful message if view missing
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('relation') && msg.includes('does not exist')) {
        return NextResponse.json({ error: 'decision_aggregates view not found - run migrations' }, { status: 500 });
      }
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [], count: count ?? 0 });
  } catch (e: any) {
    console.error('report/decisions catch', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
