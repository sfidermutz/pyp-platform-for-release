// app/api/compute-debrief/route.ts
// Server-side compute route: reads canonical scenario from data/scenarios/<id>.json if client omits scenario.
// Accepts session_id as fallback for session_hint.
//
// Keep runtime=nodejs and use supabase service role for DB persistence.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const session_hint = body.session_hint ?? body.session_id ?? null;
    const scenario_id = body.scenario_id ?? null;
    const selections = body.selections ?? {};
    const reflection = body.reflection ?? '';
    const incomingScenario = body.scenario ?? null;

    // server-side canonical scenario resolution
    let sc = incomingScenario;
    if (!sc && scenario_id) {
      try {
        const file = path.join(process.cwd(), 'data', 'scenarios', `${scenario_id}.json`);
        const raw = await fs.readFile(file, 'utf8');
        sc = JSON.parse(raw);
      } catch (e: any) {
        // log but continue; compute will use best-effort
        console.error('compute-debrief: failed to load canonical scenario', e?.message ?? e);
      }
    }

    // helper to extract options and compute metrics (kept minimal & robust)
    function getOptionsFromDp(dpRaw: any): any[] {
      if (!dpRaw) return [];
      if (Array.isArray(dpRaw?.options)) return dpRaw.options;
      if (Array.isArray(dpRaw)) return dpRaw;
      if (typeof dpRaw === 'object') {
        const combined: any[] = [];
        for (const k of Object.keys(dpRaw)) {
          if (k === 'narrative' || k === 'stem' || k === 'options' || k === 'default') continue;
          const v = dpRaw[k];
          if (Array.isArray(v)) combined.push(...v);
        }
        if (Array.isArray((dpRaw as any).default)) combined.push(...(dpRaw as any).default);
        return combined;
      }
      return [];
    }

    function optionFor(dpIndex: number, optionId: string) {
      if (!sc || !optionId) return null;
      const dpRaw = dpIndex === 1 ? sc.dp1 : dpIndex === 2 ? sc.dp2 : sc.dp3;
      if (!dpRaw) return null;
      if (Array.isArray(dpRaw) || Array.isArray(dpRaw?.options)) {
        const arr = Array.isArray(dpRaw) ? dpRaw : dpRaw.options;
        return arr.find((o: any) => o.id === optionId) ?? null;
      }
      if (typeof dpRaw === 'object') {
        for (const key of Object.keys(dpRaw)) {
          const candidate = (dpRaw as any)[key];
          if (Array.isArray(candidate)) {
            const found = candidate.find((o: any) => o.id === optionId);
            if (found) return found;
          }
        }
        const combined = getOptionsFromDp(dpRaw);
        if (combined && combined.length) {
          const found = combined.find((o: any) => o.id === optionId);
          if (found) return found;
        }
      }
      return null;
    }

    // compute simple metrics
    const dpIndices = [1,2,3];
    let decisionQualitySum = 0, confidenceAlignmentSum = 0, count = 0;
    for (const idx of dpIndices) {
      const sel = selections[idx];
      if (!sel) continue;
      const opt = optionFor(idx, sel.optionId);
      const optScore = (opt && typeof opt.score === 'number') ? opt.score : 50;
      const idealConfidence = (opt && typeof opt.ideal_confidence === 'number') ? opt.ideal_confidence : 60;
      decisionQualitySum += optScore;
      confidenceAlignmentSum += Math.max(0, 100 - Math.abs((sel.confidence ?? 50) - idealConfidence));
      count++;
    }
    const decision_quality = count ? (decisionQualitySum / count) : 0;
    const confidence_alignment = count ? (confidenceAlignmentSum / count) : 0;

    const wordCount = (reflection || '').trim().split(/\s+/).filter(Boolean).length;
    let reflectionQuality = 0;
    if (wordCount < 50) {
      reflectionQuality = Math.min(50, Math.max(0, (wordCount / 50) * 50));
    } else {
      reflectionQuality = 50 + Math.min(150, wordCount - 50) / 150 * 50;
    }

    const CRI = Math.min(100, 20 + 0.2 * decision_quality + 0.3 * reflectionQuality + 30);
    const bias_awareness = Math.min(100, Math.max(0, (reflectionQuality * 0.5) + (confidence_alignment * 0.2)));
    const trust_calibration = Math.min(100, Math.max(0, (decision_quality * 0.35) + (confidence_alignment * 0.35)));
    const information_advantage = Math.min(100, Math.max(0, (decision_quality * 0.4) + (reflectionQuality * 0.1)));
    const cognitive_adaptability = Math.min(100, Math.max(0, (CRI * 0.5) + (reflectionQuality * 0.2)));
    const escalation_tendency = Math.min(100, Math.max(0, 100 - decision_quality));
    const mission_score = Math.round(
      (0.40 * decision_quality) +
      (0.20 * confidence_alignment) +
      (0.15 * reflectionQuality) +
      (0.15 * CRI) +
      (0.10 * bias_awareness)
    );

    const short_feedback = {
      line1: `Mission Score: ${mission_score}`,
      line2: `Decision Quality ${Math.round(decision_quality)} · CRI ${Math.round(CRI)}`
    };

    const metrics = {
      mission_score,
      decision_quality: Math.round(decision_quality),
      trust_calibration: Math.round(trust_calibration),
      information_advantage: Math.round(information_advantage),
      bias_awareness: Math.round(bias_awareness),
      cognitive_adaptability: Math.round(cognitive_adaptability),
      escalation_tendency: Math.round(escalation_tendency),
      CRI: Math.round(CRI),
      confidence_alignment: Math.round(confidence_alignment),
      reflection_quality: Math.round(reflectionQuality)
    };

    let debriefSaved = false, debriefId = null;
    try {
      if (supabaseAdmin && session_hint) {
        const insertPayload = {
          session_id: session_hint,
          scenario_id,
          selections: selections ?? {},
          reflection: reflection ?? '',
          metrics,
          short_feedback,
          meta: { computed_at: new Date().toISOString() }
        };
        if (sc && sc.scenario_id) insertPayload.meta.scenario_snapshot = { id: sc.scenario_id, title: sc.title ?? null };

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('debriefs')
          .insert([insertPayload])
          .select('*')
          .single();

        if (!insertErr && inserted) {
          debriefSaved = true;
          debriefId = inserted.id ?? null;
        } else if (insertErr) {
          console.error('debrief insert err', insertErr);
        }
      }
    } catch (dbErr) {
      console.error('debrief persist exception', dbErr);
    }

    return new Response(JSON.stringify({ ...metrics, short_feedback, debrief_saved: debriefSaved, debrief_id: debriefId }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('compute-debrief error', e);
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
