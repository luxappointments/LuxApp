import { PLAN_CONFIG } from "@/lib/billing/plans";
import { SubscriptionPlan } from "@/types/domain";

export function canCreateBusiness(plan: SubscriptionPlan, currentBusinesses: number) {
  const limit = PLAN_CONFIG[plan].businessLimit;
  return currentBusinesses < limit;
}

export function canAddStaff(plan: SubscriptionPlan, currentStaff: number) {
  const limit = PLAN_CONFIG[plan].staffLimit;
  return currentStaff < limit;
}

export function includesFeature(plan: SubscriptionPlan, feature: "smartSlots" | "globalDynamicDeposit") {
  return Boolean(PLAN_CONFIG[plan][feature]);
}
