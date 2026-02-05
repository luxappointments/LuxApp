import { createClient } from "@supabase/supabase-js";

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

  const { data: ownedBusiness } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedBusiness?.id) {
    return {
      ctx: {
        userId: user.id,
        email: user.email ?? null,
        businessId: ownedBusiness.id,
        isOwner: true
      }
    };
  }

  const { data: membership } = await admin
    .from("business_memberships")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) {
    return { error: "No tienes negocio asignado", status: 403 };
  }

  return {
    ctx: {
      userId: user.id,
      email: user.email ?? null,
      businessId: membership.business_id,
      isOwner: false
    }
  };
}
