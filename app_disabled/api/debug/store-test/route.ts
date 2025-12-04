// app/api/debug/store-test/route.ts
/**
 * Debug route: attempts to insert a small test row into public.scenario_metrics
 * Accepts optional query params:
 *  - session_id
 *  - scenario_id
 *
 * Returns:
 *  - { success: true, id: ... } on success
 *  - { error: 'db error', detail: '...' } on failure (detail included for debug)
 *
 * Safe for debugging only. Not intended for production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SHOW_DB_ERRORS = (process.env.SHOW_DB_ERRORS || 'false').toLowerCase() === 'true';

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function toIntish(v: any): number | null {
  if (v === null || typeof v === 'undefined') return null;
  const n = Number(v);
  if (Number.isFinite(n)) return Math.round(n);
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const scenario_id = url.searchParams.get('scenario_id') ?? 'HYB-01';
    const session_id = url.searchParams.get('session_id') ?? null;

    // small deterministic test metrics
    const row: any = {
      session_id,
      scenario_id,
      mission_score: 50,
      decision_quality: 50,
      trust_calibration: 50,
      information_advantage: 10,
      bias_awareness: 20,
      cognitive_adaptability: 30,
      escalation_tendency: 5,
      cri: 50,
      confidence_alignment: 50,
      reflection_quality: 50,
      meta: { debug: true },
      computed_at: new Date().toISOString()
    };

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, persisted: false, reason: 'no supabase configured on server' });
    }

    const { data, error } = await supabaseAdmin
      .from('scenario_metrics')
      .insert([row])
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('debug/store-test db error', error);
      if (SHOW_DB_ERRORS) {
        return NextResponse.json({ error: 'db error', detail: String(error?.message ?? error) }, { status: 500 });
      }
      // always return detail for this debug route so you can see it in the UI
      return NextResponse.json({ error: 'db error', detail: String(error?.message ?? error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, persisted: true, id: data?.id ?? null, row: data ?? null });
  } catch (e: any) {
    console.error('debug/store-test exception', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
