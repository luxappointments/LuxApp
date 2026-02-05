import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const user = authData.user;
  const admin = getAdminSupabase();

  const { data: appointments, error: apptError } = await admin
    .from("appointments")
    .select("id, starts_at, status, required_deposit_cents, total_price_cents, external_payment_status, external_payment_proof_url, external_payment_method, businesses(id, name, slug, logo_url)")
    .or(`customer_id.eq.${user.id},client_email.eq.${user.email}`)
    .order("starts_at", { ascending: true });

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 400 });

  const businessIds = Array.from(new Set((appointments || []).map((item: any) => item.businesses?.id).filter(Boolean)));

  const { data: methods } = await admin
    .from("business_payment_methods")
    .select("business_id, method, account_value, payment_url, notes")
    .in("business_id", businessIds)
    .eq("is_enabled", true);

  const methodsByBusiness = (methods || []).reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.business_id]) acc[item.business_id] = [];
    acc[item.business_id].push(item);
    return acc;
  }, {});

  return NextResponse.json({ appointments: appointments || [], methodsByBusiness });
}
