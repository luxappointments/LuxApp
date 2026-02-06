import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { createBusinessNotification } from "@/lib/notifications/in-app";

const schema = z.object({
  appointmentId: z.string().uuid()
});

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const user = authData.user;
  const admin = getAdminSupabase();

  const { data: appt, error: apptError } = await admin
    .from("appointments")
    .select("id, business_id, starts_at, status, client_email, customer_id")
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();

  if (apptError || !appt) return NextResponse.json({ error: apptError?.message || "Cita no encontrada" }, { status: 404 });

  const isOwner = appt.customer_id === user.id || appt.client_email === user.email;
  if (!isOwner) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  if (["canceled_by_client", "canceled_by_business", "no_show", "completed", "paid"].includes(appt.status)) {
    return NextResponse.json({ error: "No puedes cancelar esta cita." }, { status: 400 });
  }

  const { data: policy } = await admin
    .from("business_policies")
    .select("min_cancel_minutes")
    .eq("business_id", appt.business_id)
    .maybeSingle();

  const minCancelMinutes = policy?.min_cancel_minutes ?? 240;
  const minutesBefore = Math.floor((new Date(appt.starts_at).getTime() - Date.now()) / 60000);
  if (minutesBefore < minCancelMinutes) {
    return NextResponse.json({ error: "Fuera del periodo de cancelación." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("appointments")
    .update({
      status: "canceled_by_client",
      canceled_at: new Date().toISOString(),
      cancel_reason: `client_canceled_${minCancelMinutes}m`
    })
    .eq("id", appt.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  await createBusinessNotification({
    businessId: appt.business_id,
    appointmentId: appt.id,
    kind: "appointment_canceled_by_client",
    payload: {
      title: "Cancelación solicitada",
      body: "El cliente canceló la cita dentro del periodo permitido."
    }
  });

  return NextResponse.json({ ok: true });
}
