/**
 * lib/challenge_coin.ts
 * Simple helper: compute challenge coin progress based on scenarios completed & missionScore.
 */

export function computeChallengeCoinProgress(runs: { scenario_key: string; missionScore: number }[], totalScenarios = 10) {
  // simple approach: earn a star for each scenario with missionScore >= 70
  const stars = runs.filter(r => r.missionScore >= 70).length;
  const progressPercentage = Math.round((stars / totalScenarios) * 100);
  return { stars, total: totalScenarios, progressPercentage };
}
