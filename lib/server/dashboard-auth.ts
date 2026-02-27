import { createClient } from "@supabase/supabase-js";

import { SINGLE_BUSINESS_SLUG_ALIASES } from "@/lib/single-business";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface DashboardContext {
  userId: string;
  email: string | null;
  businessId: string;
  isOwner: boolean;
}

export async function getDashboardContext(req: Request): Promise<{ ctx?: DashboardContext; error?: string; status?: number }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local", status: 500 };
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: "Missing auth token", status: 401 };
  }

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);

  if (authError || !authData.user) {
    return { error: "Token inválido", status: 401 };
  }

  const user = authData.user;
  const admin = getAdminSupabase();

  const { data: ownedBusinesses } = await admin
    .from("businesses")
    .select("id, slug, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const preferredOwned =
    (ownedBusinesses || []).find((row: any) =>
      SINGLE_BUSINESS_SLUG_ALIASES.includes(String(row.slug || "") as (typeof SINGLE_BUSINESS_SLUG_ALIASES)[number])
    ) || (ownedBusinesses || [])[0];

  if (preferredOwned?.id) {
    return {
      ctx: {
        userId: user.id,
        email: user.email ?? null,
        businessId: preferredOwned.id,
        isOwner: true
      }
    };
  }

  const { data: memberships } = await admin
    .from("business_memberships")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(50);

  const membershipBusinessIds = (memberships || []).map((row: any) => row.business_id).filter(Boolean);
  if (membershipBusinessIds.length === 0) {
    return { error: "No tienes negocio asignado", status: 403 };
  }

  const { data: memberBusinesses } = await admin
    .from("businesses")
    .select("id, slug, created_at")
    .in("id", membershipBusinessIds)
    .order("created_at", { ascending: true });

  const preferredMemberBusiness =
    (memberBusinesses || []).find((row: any) =>
      SINGLE_BUSINESS_SLUG_ALIASES.includes(String(row.slug || "") as (typeof SINGLE_BUSINESS_SLUG_ALIASES)[number])
    ) || (memberBusinesses || [])[0];

  if (!preferredMemberBusiness?.id) {
    return { error: "No tienes negocio asignado", status: 403 };
  }

  return {
    ctx: {
      userId: user.id,
      email: user.email ?? null,
      businessId: preferredMemberBusiness.id,
      isOwner: false
    }
  };
}
