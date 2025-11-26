// app/api/compute-debrief/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_hint, scenario_id, selections = {}, reflection = '', scenario } = body;

    const sc = scenario;

    // Helper: normalize a dp object (which may be many forms) into a single options[] array
    function getOptionsFromDp(dpRaw: any): any[] {
      if (!dpRaw) return [];

      // If dpRaw has .options as an array, return it
      if (Array.isArray(dpRaw.options)) {
        return dpRaw.options;
      }

      // If dpRaw itself is an array of options, return it
      if (Array.isArray(dpRaw)) {
        return dpRaw;
      }

      // If dpRaw is an object that is a branching map (keys -> array of options),
      // gather all arrays that are arrays into a combined options array.
      if (typeof dpRaw === 'object') {
        const combined: any[] = [];
        for (const k of Object.keys(dpRaw)) {
          // Skip common metadata keys if present
          if (k === 'narrative' || k === 'stem' || k === 'options' || k === 'default') continue;
          const v = dpRaw[k];
          if (Array.isArray(v)) {
            combined.push(...v);
          }
        }
        // If there is a default branch and it's an array, include it at the end
        if (Array.isArray((dpRaw as any).default)) {
          combined.push(...(dpRaw as any).default);
        }
        // If no arrays found, but dpRaw has some keys which are options objects (rare), attempt to coerce
        // Otherwise combined could be empty — return as-is
        return combined;
      }

      return [];
    }

    // Find option by id within DP index 1|2|3, supporting both flat and branching dp structures
    function optionFor(dpIndex: number, optionId: string) {
      if (!sc || !optionId) return null;

      const dpRaw = dpIndex === 1 ? sc.dp1 : dpIndex === 2 ? sc.dp2 : sc.dp3;
      // If dpRaw is absent return null
      if (!dpRaw) return null;

      // If dpRaw is a normal structure with .options or an array, search directly
      if (Array.isArray(dpRaw) || Array.isArray(dpRaw?.options)) {
        const arr = Array.isArray(dpRaw) ? dpRaw : dpRaw.options;
        return arr.find((o: any) => o.id === optionId) ?? null;
      }

      // If dpRaw is an object (branching map or mixed), attempt direct matches in its branches
      if (typeof dpRaw === 'object') {
        // Directly search known keys that may contain arrays (branching or keyed by previous choices)
        for (const key of Object.keys(dpRaw)) {
          const candidate = (dpRaw as any)[key];
          if (Array.isArray(candidate)) {
            const found = candidate.find((o: any) => o.id === optionId);
            if (found) return found;
          }
        }

        // As fallback, try combining arrays into one list and search
        const combined = getOptionsFromDp(dpRaw);
        if (combined && combined.length) {
          const found = combined.find((o: any) => o.id === optionId);
          if (found) return found;
        }
      }

      // If all else fails, return null
      return null;
    }

    // compute metrics (original logic) using robust optionFor
    const dpIndices = [1,2,3];
    let decisionQualitySum = 0;
    let confidenceAlignmentSum = 0;
    let count = 0;

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

    const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
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
      line1: `Mission Score: ${mission_score} — ${mission_score >= 75 ? 'Strong decision alignment' : (mission_score >= 50 ? 'Competent with growth areas' : 'Significant gaps to address')}`,
      line2: `Decision Quality ${Math.round(decision_quality)} · CRI ${Math.round(CRI)} · Reflection ${Math.round(reflectionQuality)}`
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
      confidence_alignment: Math.round(confidence_al
