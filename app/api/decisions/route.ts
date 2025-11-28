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
      scenario_id,
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    } = body;

    const session_id = session_hint ?? null;

    const { data, error } = await supabaseAdmin.from('decisions').insert([{
      session_id,
      scenario_id,
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details
    }]).select('*').single();

    if (error) {
      console.error('insert decision err', error);
      // DEBUG: return full supabase error in response for diagnosis (temporary)
      return NextResponse.json({ error: 'db error', details: error }, { status: 500 });
    }
    return NextResponse.json({ decision: data });
  } catch (e) {
    console.error('decisions route catch', e);
    return NextResponse.json({ error: 'server error', details: String(e) }, { status: 500 });
  }
}
