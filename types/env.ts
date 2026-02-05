import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_SILVER_MONTHLY: z.string().min(1),
  STRIPE_PRICE_SILVER_ANNUAL: z.string().min(1),
  STRIPE_PRICE_GOLD_MONTHLY: z.string().min(1),
  STRIPE_PRICE_GOLD_ANNUAL: z.string().min(1),
  STRIPE_PRICE_BLACK_MONTHLY: z.string().min(1),
  STRIPE_PRICE_BLACK_ANNUAL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url()
});

export const env = envSchema.parse(process.env);
