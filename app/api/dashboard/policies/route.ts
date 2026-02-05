import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const schema = z.object({
  auto_confirm: z.boolean(),
  min_cancel_minutes: z.number().int().min(0),
  late_cancel_minutes: z.number().int().min(0),
  late_tolerance_minutes: z.number().int().min(0),
  no_show_strike_limit: z.number().int().min(1),
  strike_window_days: z.number().int().min(1),
  booking_lead_days: z.number().int().min(0).max(30),
  deposit_mode: z.enum(["none", "fixed", "percent", "full"]),
  base_deposit_percent: z.number().int().min(0).max(100),
  fixed_deposit_cents: z.number().int().min(0).nullable(),
  pay_later_allowed: z.boolean(),
  external_payments_enabled: z.boolean()
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("business_policies")
    .select("*")
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });
  return NextResponse.json({ policies: data });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error: upsertError } = await admin
    .from("business_policies")
    .upsert(
      {
        business_id: ctx.businessId,
        ...parsed.data
      },
      { onConflict: "business_id" }
    )
    .select("*")
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });
  return NextResponse.json({ policies: data });
}
