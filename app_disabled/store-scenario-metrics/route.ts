// app/api/store-scenario-metrics/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

function toIntish(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * POST /api/store-scenario-metrics
 * Body expected:
 * {
 *   session_id,
 *   scenario_id,
 *   metrics: { mission_score, decision_quality, trust_calibration, ... },
 *   short_feedback?: { line1, line2 }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const session_id = body.session_id ?? null;
    const scenario_id = body.scenario_id ?? null;
    const metricsRaw = body.metrics ?? {};
    const short_feedback = body.short_feedback ?? null;

    if (!scenario_id) {
      return NextResponse.json({ error: 'scenario_id required' }, { status: 400 });
    }

    // sanitize/normalize numeric metrics
    const normalizedMetrics: Record<string, number> = {
      mission_score: toIntish(metricsRaw.mission_score ?? metricsRaw.missionScore ?? 0),
      decision_quality: toIntish(metricsRaw.decision_quality ?? metricsRaw.decisionQuality ?? 0),
      trust_calibration: toIntish(metricsRaw.trust_calibration ?? metricsRaw.trustCalibration ?? 0),
      information_advantage: toIntish(metricsRaw.information_advantage ?? metricsRaw.informationAdvantage ?? 0),
      bias_awareness: toIntish(metricsRaw.bias_awareness ?? metricsRaw.biasAwareness ?? 0),
      cognitive_adaptability: toIntish(metricsRaw.cognitive_adaptability ?? metricsRaw.cognitiveAdaptability ?? 0),
      escalation_tendency: toIntish(metricsRaw.escalation_tendency ?? metricsRaw.escalationTendency ?? 0),
      CRI: toIntish(metricsRaw.CRI ?? metricsRaw.cri ?? 0),
      confidence_alignment: toIntish(metricsRaw.confidence_alignment ?? metricsRaw.confidenceAlignment ?? 0),
      reflection_quality: toIntish(metricsRaw.reflection_quality ?? metricsRaw.reflectionQuality ?? 0)
    };

    const payload: any = {
      session_id,
      scenario_id,
      metrics: normalizedMetrics,
      short_feedback,
      meta: { stored_at: new Date().toISOString() }
    };

    if (!supabaseAdmin) {
      // DB not configured — return success to avoid breaking client flows in demo deploys
      return NextResponse.json({ success: true, persisted: false });
    }

    // Insert a metrics record (not transactional with debriefs)
    const { data, error } = await supabaseAdmin
      .from('scenario_aggregates')
      .insert([payload])
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('store-scenario-metrics db error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, persisted: true, id: data?.id ?? null });
  } catch (e) {
    console.error('store-scenario-metrics error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
