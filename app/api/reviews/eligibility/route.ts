import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ eligible: false });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ eligible: false });

  const user = authData.user;
  const admin = getAdminSupabase();

  const { data: appointments } = await admin
    .from("appointments")
    .select("id, customer_id, client_email, status")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .order("starts_at", { ascending: false })
    .limit(25);

  if (!appointments || appointments.length === 0) return NextResponse.json({ eligible: false });

  const email = user.email || "";
  const owned = appointments.filter((appt) => appt.customer_id === user.id || (email && appt.client_email === email));
  if (owned.length === 0) return NextResponse.json({ eligible: false });

  const { data: existing } = await admin
    .from("business_reviews")
    .select("appointment_id")
    .in("appointment_id", owned.map((item) => item.id));

  const reviewedIds = new Set((existing || []).map((row) => row.appointment_id));
  const available = owned.find((appt) => !reviewedIds.has(appt.id));
  if (!available) return NextResponse.json({ eligible: false });

  return NextResponse.json({ eligible: true, appointmentId: available.id });
}
