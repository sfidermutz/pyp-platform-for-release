/**
 * lib/narrative.ts
 * Small narrative generator to produce a short debrief narrative from metrics.
 * Conservative, templated phrasing per Beth's guidance.
 */

export function buildDebriefNarrative(metrics: Record<string, number>, missionScore?: number) {
  const dq = Math.round(metrics.DecisionQuality ?? 0);
  const ia = Math.round(metrics.InformationAdvantage ?? 0);
  const tc = Math.round(metrics.TrustCalibration ?? 0);
  const ca = Math.round(metrics.CognitiveAdaptability ?? 0);

  const tier = missionScore === undefined ? (dq >= 85 ? 'Exemplary' : dq >= 70 ? 'Success' : dq >= 45 ? 'Partial' : 'Failure') :
    (missionScore >= 85 ? 'Exemplary' : missionScore >= 70 ? 'Success' : missionScore >= 45 ? 'Partial' : 'Failure');

  const primaryDriver = dq >= ia && dq >= tc ? 'decision quality' : ia >= dq && ia >= tc ? 'information advantage' : 'trust calibration';

  const narrative = `Outcome tier ${tier} — Mission Score ${missionScore ?? Math.round((dq+ia+tc)/3)}. Primary driver: ${primaryDriver} (DQ ${dq}, IA ${ia}, TC ${tc}, CA ${ca}). Suggested focus: ${primaryDriver === 'decision quality' ? 'practice clearer thresholds and reflection' : primaryDriver === 'information advantage' ? 'improve fusion & verification' : 'work on confidence calibration with evidence-based checks'}.`;

  return narrative;
}
