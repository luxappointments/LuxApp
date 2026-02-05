import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
  duration_min: z.number().int().min(5).max(600),
  buffer_before_min: z.number().int().min(0).max(120),
  buffer_after_min: z.number().int().min(0).max(120),
  price_cents: z.number().int().min(0),
  price_starts_at: z.boolean().optional().default(false),
  requires_confirmation: z.boolean(),
  requires_payment: z.boolean()
});

const updateSchema = createSchema.extend({ id: z.string().uuid() });

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("services")
    .select("id, name, category, description, duration_min, buffer_before_min, buffer_after_min, price_cents, price_starts_at, image_url, requires_confirmation, requires_payment, is_active, sort_order")
    .eq("business_id", ctx.businessId)
    .order("sort_order", { ascending: true });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });
  return NextResponse.json({ services: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: max } = await admin
    .from("services")
    .select("sort_order")
    .eq("business_id", ctx.businessId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error: insertError } = await admin
    .from("services")
    .insert({
      business_id: ctx.businessId,
      ...parsed.data,
      sort_order: (max?.sort_order ?? 0) + 10,
      is_active: true
    })
    .select("id, name, category, description, duration_min, buffer_before_min, buffer_after_min, price_cents, price_starts_at, image_url, requires_confirmation, requires_payment, is_active, sort_order")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ service: data });
}

export async function PUT(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const { id, ...updates } = parsed.data;
  const admin = getAdminSupabase();

  const { data, error: updateError } = await admin
    .from("services")
    .update(updates)
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .select("id, name, category, description, duration_min, buffer_before_min, buffer_after_min, price_cents, price_starts_at, image_url, requires_confirmation, requires_payment, is_active, sort_order")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ service: data });
}

export async function DELETE(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const admin = getAdminSupabase();
  const { error: deleteError } = await admin
    .from("services")
    .update({ is_active: false })
    .eq("id", id)
    .eq("business_id", ctx.businessId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
