// app/api/compute-debrief/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_hint, scenario_id, selections = {}, reflection = '', scenario } = body;

    const sc = scenario;

    // Helper to find an option by id within a dp structure (handles flat dp, dp.options, or branching maps)
    function findOptionInCollection(collection: any): any | null {
      if (!collection) return null;
      // if it's an object with options
      if (Array.isArray(collection.options)) {
        return (collection.options || []).find((o: any) => o.id === optionIdBeingSearched) ?? null;
      }
      // if collection is directly an array
      if (Array.isArray(collection)) {
        return collection.find((o: any) => o.id === optionIdBeingSearched) ?? null;
      }
      // If it's a branching map, search through all arrays under it
      if (typeof collection === 'object') {
        for (const k of Object.keys(collection)) {
          const v = collection[k];
          if (Array.isArray(v)) {
            const found = v.find((o: any) => o.id === optionIdBeingSearched);
            if (found) return found;
          }
        }
      }
      return null;
    }

    // We'll implement optionFor that searches dp1, dp2, dp3 respecting branching maps
    function optionFor(dpIndex: number, optionId: string) {
      if (!optionId) return null;

      // Local helper uses closure variable for easy search
      // dp1
      if (dpIndex === 1) {
        const arr = (sc.dp1?.options ?? sc.dp1 ?? []);
        return (Array.isArray(arr) ? arr : (arr.options ?? [])).find((o: any) => o.id === optionId) ?? null;
      }

      // dp2
      if (dpIndex === 2) {
        // If dp2 is array-like
        if (Array.isArray(sc.dp2) || Array.isArray(sc.dp2?.options)) {
          const arr = Array.isArray(sc.dp2) ? sc.dp2 : sc.dp2.options;
          return arr.find((o: any) => o.id === optionId) ?? null;
        }
        // If dp2 is branching map
        if (sc.dp2 && typeof sc.dp2 === 'object') {
          for (const key of Object.keys(sc.dp2)) {
            const maybeArr = sc.dp2[key];
            if (Array.isArray(maybeArr)) {
              const found = maybeArr.find((o: any) => o.id === optionId);
              if (found) return found;
            }
          }
        }
        return null;
      }

      // dp3
      if (dpIndex === 3) {
        if (Array.isArray(sc.dp3) || Array.isArray(sc.dp3?.options)) {
          const arr = Array.isArray(sc.dp3) ? sc.dp3 : sc.dp3.options;
          return arr.find((o: any) => o.id === optionId) ?? null;
        }
        if (sc.dp3 && typeof sc.dp3 === 'object') {
          for (const key of Object.keys(sc.dp3)) {
            const maybeArr = sc.dp3[key];
            if (Array.isArray(maybeArr)) {
              const found = maybeArr.find((o: any) => o.id === optionId);
              if (found) return found;
            }
          }
        }
        return null;
      }

      return null;
    }

    // compute metrics same as before but use the robust optionFor
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
      confidence_alignment: Math.round(confidence_alignment),
      reflection_quality: Math.round(reflectionQuality)
    };

    return NextResponse.json({ ...metrics, short_feedback, metrics });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
