// app/api/store-scenario-metrics/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SHOW_DB_ERRORS = (process.env.SHOW_DB_ERRORS || 'false').toLowerCase() === 'true';

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

function toIntish(v: any): number | null {
  if (v === null || typeof v === 'undefined') return null;
  const n = Number(v);
  if (Number.isFinite(n)) return Math.round(n);
  return null;
}

/**
 * POST /api/store-scenario-metrics
 *
 * Expected body:
 * {
 *   session_id: "<uuid|null>",
 *   scenario_id: "HYB-01",
 *   metrics: { mission_score, decision_quality, trust_calibration, information_advantage, bias_awareness, cognitive_adaptability, escalation_tendency, CRI, confidence_alignment, reflection_quality },
 *   short_feedback?: { line1, line2 },
 *   meta?: {}
 * }
 *
 * This route writes into public.scenario_metrics (columns) — matches SQL migration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const session_id = body.session_id ?? null;
    const scenario_id = body.scenario_id ?? null;
    const metricsRaw = body.metrics ?? {};
    const meta = body.meta ?? null;
    const short_feedback = body.short_feedback ?? null;

    if (!scenario_id) {
      return NextResponse.json({ error: 'scenario_id required' }, { status: 400 });
    }

    // normalize numeric fields to avoid DB type errors
    const row: any = {
      session_id,
      scenario_id,
      mission_score: toIntish(metricsRaw.mission_score ?? metricsRaw.missionScore ?? metricsRaw.mission) ?? null,
      decision_quality: toIntish(metricsRaw.decision_quality ?? metricsRaw.decisionQuality) ?? null,
      trust_calibration: toIntish(metricsRaw.trust_calibration ?? metricsRaw.trustCalibration) ?? null,
      information_advantage: toIntish(metricsRaw.information_advantage ?? metricsRaw.informationAdvantage) ?? null,
      bias_awareness: toIntish(metricsRaw.bias_awareness ?? metricsRaw.biasAwareness) ?? null,
      cognitive_adaptability: toIntish(metricsRaw.cognitive_adaptability ?? metricsRaw.cognitiveAdaptability) ?? null,
      escalation_tendency: toIntish(metricsRaw.escalation_tendency ?? metricsRaw.escalationTendency) ?? null,
      cri: toIntish(metricsRaw.CRI ?? metricsRaw.cri) ?? toIntish(metricsRaw.Cri) ?? null,
      confidence_alignment: toIntish(metricsRaw.confidence_alignment ?? metricsRaw.confidenceAlignment) ?? null,
      reflection_quality: toIntish(metricsRaw.reflection_quality ?? metricsRaw.reflectionQuality) ?? null,
      meta: meta ?? (short_feedback ? { short_feedback } : null)
    };

    // computed_at column: allow client to provide (e.g., compute time) or use now()
    const computed_at = body.computed_at ?? new Date().toISOString();
    row.computed_at = computed_at;

    // If DB is not configured (demo), return success but indicate not persisted
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, persisted: false, reason: 'no db configured' });
    }

    // Insert into the real table: public.scenario_metrics
    const { data, error } = await supabaseAdmin
      .from('scenario_metrics')
      .insert([row])
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('store-scenario-metrics db error', error);
      if (SHOW_DB_ERRORS || process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ error: 'db error', detail: error }, { status: 500 });
      }
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, persisted: true, id: data?.id ?? null });
  } catch (e: any) {
    console.error('store-scenario-metrics exception', e);
    if (SHOW_DB_ERRORS || process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
    }
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
