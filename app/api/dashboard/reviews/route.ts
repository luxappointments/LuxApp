import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const updateSchema = z.object({
  id: z.string().uuid(),
  reply: z.string().max(1200).optional().nullable(),
  is_published: z.boolean().optional()
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("business_reviews")
    .select("id, rating, comment, reply, is_published, created_at, appointment_id")
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });
  return NextResponse.json({ reviews: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error: updateError } = await admin
    .from("business_reviews")
    .update({
      reply: parsed.data.reply ?? null,
      ...(typeof parsed.data.is_published === "boolean" ? { is_published: parsed.data.is_published } : {})
    })
    .eq("id", parsed.data.id)
    .eq("business_id", ctx.businessId)
    .select("id, rating, comment, reply, is_published, created_at, appointment_id")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ review: data });
}
