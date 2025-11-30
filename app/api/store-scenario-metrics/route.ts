// app/api/store-scenario-metrics/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SHOW_DB_ERRORS = (process.env.SHOW_DB_ERRORS || 'false').toLowerCase() === 'true';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function toIntish(v: any): number | null {
  if (v === null || typeof v === 'undefined') return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    return Math.trunc(v);
  }
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return Math.trunc(n);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, scenario_id, metrics } = body ?? {};

    if (!metrics) {
      return NextResponse.json({ error: 'missing metrics' }, { status: 400 });
    }

    // Normalize commonly cased keys (snake_case, camelCase, upper-case "CRI")
    const m: any = metrics;

    const row = {
      session_id,
      scenario_id,
      mission_score: toIntish(m.mission_score ?? m.missionScore ?? m.mission),
      decision_quality: toIntish(m.decision_quality ?? m.decisionQuality ?? m.decision_quality),
      trust_calibration: toIntish(m.trust_calibration ?? m.trustCalibration),
      information_advantage: toIntish(m.information_advantage ?? m.informationAdvantage),
      bias_awareness: toIntish(m.bias_awareness ?? m.biasAwareness),
      cognitive_adaptability: toIntish(m.cognitive_adaptability ?? m.cognitiveAdaptability),
      escalation_tendency: toIntish(m.escalation_tendency ?? m.escalationTendency),
      cri: toIntish(m.CRI ?? m.cri ?? m.CRI_value ?? m.cri_value),
      confidence_alignment: toIntish(m.confidence_alignment ?? m.confidenceAlignment),
      reflection_quality: toIntish(m.reflection_quality ?? m.reflectionQuality),
      // meta: allow arbitrary extras for later (optional)
      meta: m.meta ?? null
    };

    const { data, error } = await supabaseAdmin
      .from('scenario_metrics')
      .insert([row])
      .select('*')
      .single();

    if (error) {
      console.error('store scenario metrics error', error);

      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('relation') && msg.includes('does not exist')) {
        return NextResponse.json({ error: 'scenario_metrics table not found - run DB migrations' }, { status: 500 });
      }

      // helpful debug in dev / when explicitly enabled
      if (SHOW_DB_ERRORS || process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ error: 'db error', detail: error }, { status: 500 });
      }
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ inserted: data });
  } catch (e: any) {
    console.error('store-scenario-metrics catch', e);
    if (SHOW_DB_ERRORS || process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
    }
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
