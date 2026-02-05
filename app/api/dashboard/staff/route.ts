import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const createSchema = z.object({
  display_name: z.string().min(2),
  bio: z.string().optional()
});

const updateSchema = createSchema.extend({
  id: z.string().uuid()
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();
  const { data, error: queryError } = await admin
    .from("staff_profiles")
    .select("id, display_name, bio, avatar_url, is_active")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 400 });
  return NextResponse.json({ staff: data || [] });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error: insertError } = await admin
    .from("staff_profiles")
    .insert({
      business_id: ctx.businessId,
      display_name: parsed.data.display_name,
      bio: parsed.data.bio || null,
      is_active: true
    })
    .select("id, display_name, bio, avatar_url, is_active")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ staff: data });
}

export async function PUT(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { id, ...updates } = parsed.data;
  const { data, error: updateError } = await admin
    .from("staff_profiles")
    .update({
      display_name: updates.display_name,
      bio: updates.bio || null
    })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .select("id, display_name, bio, avatar_url, is_active")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const admin = getAdminSupabase();
  const { error: deleteError } = await admin
    .from("staff_profiles")
    .update({ is_active: false })
    .eq("id", id)
    .eq("business_id", ctx.businessId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
