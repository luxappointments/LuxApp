import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  businessName: z.string().min(2),
  businessCity: z.string().min(2),
  businessCategory: z.string().min(2),
  businessSlug: z.string().min(3)
});

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. No se puede crear negocio con privilegios." },
      { status: 500 }
    );
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

  const admin = getAdminSupabase();
  const user = authData.user;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
      phone: parsed.data.phone,
      role: "owner"
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      owner_id: user.id,
      slug: parsed.data.businessSlug,
      name: parsed.data.businessName,
      city: parsed.data.businessCity,
      category: parsed.data.businessCategory,
      is_active: true
    })
    .select("id")
    .single();

  if (businessError) {
    return NextResponse.json({ error: businessError.message }, { status: 400 });
  }

  await admin.from("business_policies").upsert(
    {
      business_id: business.id,
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
      business_id: business.id,
      user_id: user.id,
      role: "owner",
      is_active: true
    },
    { onConflict: "business_id,user_id" }
  );

  await anon.auth.updateUser({
    data: {
      ...user.user_metadata,
      account_type: "business"
    }
  });

  return NextResponse.json({ ok: true, businessId: business.id });
}
