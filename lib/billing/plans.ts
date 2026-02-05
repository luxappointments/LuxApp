import { SubscriptionPlan } from "@/types/domain";

export interface PlanDefinition {
  name: string;
  monthly: number;
  annual: number;
  description: string;
  businessLimit: number;
  staffLimit: number;
  smartSlots: boolean;
  globalDynamicDeposit: boolean;
  features: string[];
}

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "silver", "gold", "black"];

export const PLAN_CONFIG = {
  free: {
    name: "Starter",
    monthly: 0,
    annual: 0,
    description: "Para arrancar y validar tu negocio.",
    businessLimit: 1,
    staffLimit: 1,
    smartSlots: false,
    globalDynamicDeposit: false,
    features: [
      "1 negocio",
      "1 staff",
      "Hasta 40 citas al mes",
      "Pagos externos con comprobante",
      "Emails básicos"
    ]
  },
  silver: {
    name: "Silver",
    monthly: 19,
    annual: 190,
    description: "Crece con más staff y depósitos básicos.",
    businessLimit: 1,
    staffLimit: 3,
    smartSlots: false,
    globalDynamicDeposit: false,
    features: [
      "1 negocio",
      "Hasta 3 staff",
      "Citas ilimitadas",
      "Stripe depósitos fijo o %",
      "Horarios avanzados + breaks",
      "Emails premium"
    ]
  },
  gold: {
    name: "Gold",
    monthly: 39,
    annual: 390,
    description: "Plan pro con automatización inteligente.",
    businessLimit: 2,
    staffLimit: 10,
    smartSlots: true,
    globalDynamicDeposit: false,
    features: [
      "Hasta 2 negocios",
      "Hasta 10 staff",
      "Citas ilimitadas",
      "Slots inteligentes",
      "No-show protection por negocio",
      "Políticas avanzadas",
      "Analytics básicos"
    ]
  },
  black: {
    name: "Black",
    monthly: 79,
    annual: 790,
    description: "Escala sin límites con protección global.",
    businessLimit: Number.POSITIVE_INFINITY,
    staffLimit: Number.POSITIVE_INFINITY,
    smartSlots: true,
    globalDynamicDeposit: true,
    features: [
      "Negocios ilimitados",
      "Staff ilimitado",
      "Depósito dinámico global 0/30/100",
      "Soft blacklist global",
      "SMS reminders (si activas proveedor)",
      "Branding completo",
      "Prioridad en búsqueda",
      "Analytics pro"
    ]
  }
} satisfies Record<SubscriptionPlan, PlanDefinition>;

export function getStripePriceId(plan: Exclude<SubscriptionPlan, "free">, interval: "monthly" | "annual") {
  const map = {
    silver: {
      monthly: process.env.STRIPE_PRICE_SILVER_MONTHLY!,
      annual: process.env.STRIPE_PRICE_SILVER_ANNUAL!
    },
    gold: {
      monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY!,
      annual: process.env.STRIPE_PRICE_GOLD_ANNUAL!
    },
    black: {
      monthly: process.env.STRIPE_PRICE_BLACK_MONTHLY!,
      annual: process.env.STRIPE_PRICE_BLACK_ANNUAL!
    }
  };

  return map[plan][interval];
}
