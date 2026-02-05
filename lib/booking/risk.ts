export interface RiskInput {
  businessDepositPercent: number;
  globalRiskScore: number;
  hasGlobalSoftBlacklist: boolean;
}

export function getGlobalMinDepositPercent(score: number): number {
  if (score < 3) return 0;
  if (score < 6) return 30;
  return 100;
}

export function getRequiredDepositPercent(input: RiskInput): number {
  if (input.hasGlobalSoftBlacklist) return 100;

  const globalMin = getGlobalMinDepositPercent(input.globalRiskScore);
  return Math.max(input.businessDepositPercent, globalMin);
}

export function computeRiskScore(current: number, event: "no_show" | "late_cancel" | "completed") {
  const weight = {
    no_show: 3,
    late_cancel: 2,
    completed: -1
  }[event];

  return Math.max(0, current + weight);
}
