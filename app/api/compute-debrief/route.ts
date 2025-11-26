import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_hint, scenario_id, selections = {}, reflection = '', scenario } = body;

    const sc = scenario;

    function optionFor(dpIndex: number, optionId: string) {
      const dp = dpIndex === 1 ? sc.dp1 : dpIndex === 2 ? sc.dp2 : sc.dp3;
      return (dp?.options ?? []).find((o: any) => o.id === optionId) ?? null;
    }

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
