import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";

const createSchema = z.object({
  businessId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1200).optional()
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("business_reviews")
    .select("id, rating, comment, reply, created_at")
    .eq("business_id", businessId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ reviews: data || [] });
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión para dejar review." }, { status: 401 });

  const payload = await req.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const user = authData.user;
  const admin = getAdminSupabase();

  const { data: appointment, error: apptError } = await admin
    .from("appointments")
    .select("id, business_id, status, customer_id, client_email")
    .eq("id", parsed.data.appointmentId)
    .eq("business_id", parsed.data.businessId)
    .maybeSingle();

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 400 });
  if (!appointment) return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  if (appointment.status !== "completed") return NextResponse.json({ error: "Solo citas completadas pueden dejar review." }, { status: 400 });

  const email = user.email || "";
  const belongs = appointment.customer_id === user.id || (email && appointment.client_email === email);
  if (!belongs) return NextResponse.json({ error: "No autorizado para esta cita." }, { status: 403 });

  const { data: existing } = await admin
    .from("business_reviews")
    .select("id")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  if (existing?.id) return NextResponse.json({ error: "Ya existe un review para esta cita." }, { status: 400 });

  const { data, error } = await admin
    .from("business_reviews")
    .insert({
      business_id: parsed.data.businessId,
      appointment_id: appointment.id,
      customer_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      is_published: true
    })
    .select("id, rating, comment, reply, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ review: data });
}
