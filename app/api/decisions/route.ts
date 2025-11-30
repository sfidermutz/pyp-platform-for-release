// app/api/decisions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for decisions route');
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/decisions
 * Accepts per-click (ephemeral) decision events. These are NOT the authoritative lock.
 * We mark them with details.is_ephemeral = true so analytics can filter them from final locks.
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

    // Ensure details is an object and flag ephemeral
    const detailsSafe = (details && typeof details === 'object') ? { ...details } : {};
    if (typeof detailsSafe.is_ephemeral === 'undefined') {
      detailsSafe.is_ephemeral = true;
    }

    const { data, error } = await supabaseAdmin.from('decisions').insert([{
      session_id,
      scenario_id: null,      // keep null to avoid uuid parse issues
      scenario_code,
      decision_point,
      selected_option_id,
      confidence,
      time_on_page_ms,
      details: detailsSafe
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
