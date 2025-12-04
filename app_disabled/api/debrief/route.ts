// app/api/debrief/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

/**
 * GET /api/debrief?session_id=...&scenario_id=...
 * Returns latest debrief row for the given session & scenario (if any).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id') ?? undefined;
    const scenario_id = url.searchParams.get('scenario_id') ?? undefined;

    if (!session_id || !scenario_id) {
      return NextResponse.json({ error: 'session_id & scenario_id required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'server not configured for DB access' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('debriefs')
      .select('*')
      .eq('session_id', session_id)
      .eq('scenario_id', scenario_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('debrief fetch error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ debrief: data });
  } catch (e) {
    console.error('debrief GET error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
