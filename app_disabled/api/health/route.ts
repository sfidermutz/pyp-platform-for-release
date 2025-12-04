// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: true, db: false, reason: 'no supabase configured' });
    }
    // quick query to check table exists & ability to select
    const { data, error } = await supabaseAdmin
      .from('scenario_metrics')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: true, db: false, detail: String(error.message || error) });
    }
    return NextResponse.json({ ok: true, db: true, count: (data ?? []).length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, db: false, detail: String(e?.message ?? e) }, { status: 500 });
  }
}
