import { NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();

  const [{ data: business, error: businessError }, { data: policies, error: policiesError }] = await Promise.all([
    admin
      .from("businesses")
      .select("id, owner_id, name, slug, city, category, description, timezone, logo_url, cover_url, instagram_url, facebook_url, tiktok_url")
      .eq("id", ctx.businessId)
      .single(),
    admin
      .from("business_policies")
      .select("*")
      .eq("business_id", ctx.businessId)
      .maybeSingle()
  ]);

  if (businessError) return NextResponse.json({ error: businessError.message }, { status: 400 });
  if (policiesError) return NextResponse.json({ error: policiesError.message }, { status: 400 });

  return NextResponse.json({ business, policies, isOwner: ctx.isOwner });
}
