// app/api/decisions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/decisions
 * Accepts a decision post from the client. The client currently sends a scenario
 * identifier string (scenario code, e.g., "HYB-01") as `scenario_id`. Because the
 * decisions table's `scenario_id` column is a UUID, we write NULL there to avoid
 * UUID parsing errors and store the human-readable code in `scenario_code` text.
 *
 * Server returns a minimal error on DB failure (no DB internals exposed).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_hint,
      scenario_id,          // usually a scenario code like "HYB-01"
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    } = body;

    const session_id = session_hint ?? null;
    const scenario_code = typeof scenario_id === 'string' ? scenario_id : null;

    const { data, error } = await supabaseAdmin.from('decisions').insert([{
      session_id,
      scenario_id: null,      // keep null to avoid uuid parse issues
      scenario_code,
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    }]).select('*').single();

    if (error) {
      console.error('insert decision err', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    return NextResponse.json({ decision: data });
  } catch (e) {
    console.error('decisions route catch', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
