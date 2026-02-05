import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const markSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: fetchError } = await admin
    .from("notifications")
    .select("id, kind, payload, appointment_id, read_at, created_at")
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });

  return NextResponse.json({ alerts: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = markSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { error: updateError } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", parsed.data.ids)
    .eq("business_id", ctx.businessId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
