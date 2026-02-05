import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  slug: z.string().min(3),
  city: z.string().min(2),
  category: z.string().min(2),
  timezone: z.string().min(2),
  description: z.string().optional(),
  instagram_url: z.string().url().optional().or(z.literal("")),
  facebook_url: z.string().url().optional().or(z.literal("")),
  tiktok_url: z.string().url().optional().or(z.literal(""))
});

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local" }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const user = authData.user;
  const admin = getAdminSupabase();

  const input = parsed.data;
  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ") ||
    null;
  const phone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;

  // Ensure owner profile exists before touching businesses (FK: businesses.owner_id -> profiles.id)
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      phone,
      role: "owner"
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (input.id) {
    const { data, error } = await admin
      .from("businesses")
      .update({
        name: input.name,
        slug: input.slug,
        city: input.city,
        category: input.category,
        timezone: input.timezone,
        description: input.description ?? null,
        instagram_url: input.instagram_url || null,
        facebook_url: input.facebook_url || null,
        tiktok_url: input.tiktok_url || null
      })
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .select("id, owner_id, name, slug, city, category, description, timezone, logo_url, cover_url, instagram_url, facebook_url, tiktok_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ business: data });
  }

  const { data, error } = await admin
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: input.name,
      slug: input.slug,
      city: input.city,
      category: input.category,
      timezone: input.timezone,
      description: input.description ?? null,
      instagram_url: input.instagram_url || null,
      facebook_url: input.facebook_url || null,
      tiktok_url: input.tiktok_url || null,
      is_active: true
    })
    .select("id, owner_id, name, slug, city, category, description, timezone, logo_url, cover_url, instagram_url, facebook_url, tiktok_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("business_policies").upsert(
    {
      business_id: data.id,
      auto_confirm: false,
      deposit_mode: "none",
      base_deposit_percent: 0,
      min_cancel_minutes: 240,
      late_cancel_minutes: 120,
      late_tolerance_minutes: 10
    },
    { onConflict: "business_id" }
  );

  await admin.from("business_memberships").upsert(
    {
      business_id: data.id,
      user_id: user.id,
      role: "owner",
      is_active: true
    },
    { onConflict: "business_id,user_id" }
  );

  return NextResponse.json({ business: data });
}
