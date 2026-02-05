import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const daySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  is_closed: z.boolean(),
  slot_granularity_min: z.number().int().refine((v) => [5, 10, 15].includes(v), "Granularidad inválida")
});

const schema = z.object({
  days: z.array(daySchema).length(7)
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("business_schedules")
    .select("weekday, start_time, end_time, is_closed, slot_granularity_min")
    .eq("business_id", ctx.businessId)
    .order("weekday", { ascending: true });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });
  return NextResponse.json({ schedule: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const rows = parsed.data.days.map((day) => ({ ...day, business_id: ctx.businessId }));

  const { error: upsertError } = await admin.from("business_schedules").upsert(rows, { onConflict: "business_id,weekday" });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
