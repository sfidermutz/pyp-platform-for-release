// app/api/decisions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_hint,
      scenario_id,          // currently used as scenario code like "HYB-01"
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    } = body;

    const session_id = session_hint ?? null;

    // We expect `scenario_id` from the client to be the scenario CODE ("HYB-01"),
    // but the decisions table stores scenario_id as a UUID. Insert NULL into
    // scenario_id (or map to a real scenario uuid if available) and save the
    // code in `scenario_code` (text). The DB must have a scenario_code column;
    // below SQL will add it if missing.
    const scenario_code = scenario_id ?? null;

    const { data, error } = await supabaseAdmin.from('decisions').insert([{
      session_id,
      scenario_id: null,           // keep as null to avoid uuid parse error
      scenario_code,               // text column for human-readable id (HYB-01)
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    }]).select('*').single();

    if (error) {
      console.error('insert decision err', error);
      return NextResponse.json({ error: 'db error', details: error }, { status: 500 });
    }
    return NextResponse.json({ decision: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error', details: String(e) }, { status: 500 });
  }
}
