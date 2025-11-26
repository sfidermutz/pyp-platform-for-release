// app/api/store-scenario-metrics/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, scenario_id, metrics } = body;
    if (!metrics) return NextResponse.json({ error: 'missing metrics' }, { status: 400 });

    const row = {
      session_id,
      scenario_id,
      mission_score: metrics.mission_score ?? null,
      decision_quality: metrics.decision_quality ?? null,
      trust_calibration: metrics.trust_calibration ?? null,
      information_advantage: metrics.information_advantage ?? null,
      bias_awareness: metrics.bias_awareness ?? null,
      cognitive_adaptability: metrics.cognitive_adaptability ?? null,
      escalation_tendency: metrics.escalation_tendency ?? null,
      CRI: metrics.CRI ?? null,
      confidence_alignment: metrics.confidence_alignment ?? null,
      reflection_quality: metrics.reflection_quality ?? null
    };

    const { data, error } = await supabaseAdmin.from('scenario_metrics').insert([row]).select('*').single();
    if (error) {
      console.error('store scenario metrics error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    return NextResponse.json({ inserted: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
