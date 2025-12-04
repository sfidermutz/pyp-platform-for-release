// app/api/decisions/lock/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for decisions lock API');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/decisions/lock
 *
 * Body:
 * {
 *   session_hint, scenario_id, decision_point,
 *   final_option_id,
 *   selection_sequence: [...],
 *   change_count: int,
 *   confidence: 1..5,
 *   confidence_change_count: int (optional),
 *   time_on_page_ms: int,
 *   timestamps: { first_selection: int|null, final_selection: int }
 * }
 *
 * Persist a single authoritative "locked" decision. Aggregated fields are stored inside details jsonb.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_hint,
      scenario_id,
      decision_point,
      final_option_id,
      selection_sequence,
      change_count,
      confidence,
      confidence_change_count,
      time_on_page_ms,
      timestamps
    } = body;

    // Basic validation
    if (!decision_point || !final_option_id) {
      return NextResponse.json({ error: 'decision_point and final_option_id required' }, { status: 400 });
    }

    // Enforce confidence presence per spec
    if (typeof confidence === 'undefined' || confidence === null) {
      // Exact standardized prompt
      return NextResponse.json({ error: 'Please rate your confidence before continuing.' }, { status: 400 });
    }

    if (typeof confidence !== 'number' || confidence < 1 || confidence > 5) {
      return NextResponse.json({ error: 'confidence must be an integer between 1 and 5' }, { status: 400 });
    }

    // Build details: include sequence and bookkeeping
    const details: any = {
      selection_sequence: Array.isArray(selection_sequence) ? selection_sequence : [],
      change_count: typeof change_count === 'number' ? change_count : (Array.isArray(selection_sequence) ? selection_sequence.length : 0),
      timestamps: timestamps ?? null,
      confidence_change_count: typeof confidence_change_count === 'number' ? confidence_change_count : 0,
      is_final: true,
      step: decision_point
    };

    const session_id = session_hint ?? null;
    const scenario_code = typeof scenario_id === 'string' ? scenario_id : null;

    // Insert into decisions table (re-using existing decisions schema).
    const { data, error } = await supabaseAdmin
      .from('decisions')
      .insert([{
        session_id,
        scenario_id: null, // keep null to avoid uuid parse issues; store human-readable code
        scenario_code,
        decision_point,
        selected_option_id: final_option_id,
        confidence,
        time_on_page_ms: time_on_page_ms ?? null,
        details,
      }])
      .select('*')
      .single();

    if (error) {
      console.error('decisions lock insert err', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ decision: data });
  } catch (e) {
    console.error('decisions/lock route catch', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
