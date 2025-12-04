export type MetricKeys = 'DecisionQuality'|'InformationAdvantage'|'TrustCalibration'|'BiasAwareness'|'CognitiveAdaptability'|'EscalationTendency';

export function computeScenarioMetrics(optionsChosen: any[]) {
  const totals: Record<string, number> = {};
  for (const o of optionsChosen) {
    const mw = o.metric_weights || {};
    for (const k of Object.keys(mw)) {
      totals[k] = (totals[k] || 0) + Number(mw[k] || 0);
    }
  }
  const normalized: Record<string, number> = {};
  for (const k of Object.keys(totals)) {
    const v = totals[k];
    normalized[k] = Math.round(50 + v * 10);
  }
  return normalized;
}

export function computeMissionScore(metrics: Record<string,number>) {
  const DQ = metrics.DecisionQuality ?? 50;
  const IA = metrics.InformationAdvantage ?? 50;
  const TC = metrics.TrustCalibration ?? 50;
  const CA = metrics.CognitiveAdaptability ?? 50;
  const ms = 0.4 * DQ + 0.25 * IA + 0.15 * TC + 0.2 * CA;
  return Math.round(ms);
}
