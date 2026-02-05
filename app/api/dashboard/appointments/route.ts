import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const createSchema = z.object({
  service_id: z.string().uuid(),
  staff_id: z.string().uuid().nullable(),
  starts_at: z.string().datetime(),
  client_email: z.string().email(),
  status: z
    .enum([
      "pending_confirmation",
      "confirmed",
      "awaiting_payment",
      "paid",
      "canceled_by_client",
      "canceled_by_business",
      "no_show",
      "completed"
    ])
    .default("confirmed")
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "today";

  const now = new Date();
  const rangeStart = mode === "week" ? startOfDay(now) : startOfDay(now);
  const rangeEnd = mode === "week" ? endOfDay(addDays(now, 6)) : endOfDay(now);

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("appointments")
    .select("id, starts_at, status, client_email, required_deposit_percent, required_deposit_cents, total_price_cents, external_payment_method, external_payment_status, external_payment_proof_url, services(name), staff_profiles(display_name)")
    .eq("business_id", ctx.businessId)
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });

  return NextResponse.json({ appointments: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error: insertError } = await admin
    .from("appointments")
    .insert({
      business_id: ctx.businessId,
      service_id: parsed.data.service_id,
      staff_id: parsed.data.staff_id,
      starts_at: parsed.data.starts_at,
      client_email: parsed.data.client_email,
      status: parsed.data.status,
      notes: "manual_block"
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ appointment: data });
}
