import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendAppointmentStatusEmail } from "@/lib/notifications/email";
import { createBusinessNotification } from "@/lib/notifications/in-app";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const formData = await req.formData();
  const appointmentId = String(formData.get("appointmentId") || "");
  const method = String(formData.get("method") || "");
  const file = formData.get("file");

  if (!appointmentId || !(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: appt, error: apptError } = await admin
    .from("appointments")
    .select("id, business_id, starts_at, client_email, status, customer_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptError || !appt) return NextResponse.json({ error: apptError?.message || "Cita no encontrada" }, { status: 400 });

  if (appt.customer_id && appt.customer_id !== authData.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ext = file.name.split(".").pop() || "png";
  const path = `${appt.business_id}/appointments/${appointmentId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage.from("business-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream"
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data: publicData } = admin.storage.from("business-assets").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const { error: updateError } = await admin
    .from("appointments")
    .update({
      external_payment_method: method || null,
      external_payment_proof_url: publicUrl,
      external_payment_status: "submitted",
      status: appt.status === "pending_confirmation" ? "awaiting_payment" : appt.status
    })
    .eq("id", appointmentId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  await sendAppointmentStatusEmail({
    to: appt.client_email,
    businessName: "Tu negocio",
    serviceName: "Depósito enviado",
    startsAt: appt.starts_at,
    status: "payment_submitted"
  });

  const { data: businessOwner } = await admin
    .from("businesses")
    .select("owner_id, name")
    .eq("id", appt.business_id)
    .maybeSingle();

  if (businessOwner?.owner_id) {
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", businessOwner.owner_id)
      .maybeSingle();

    if (ownerProfile?.email) {
      await sendAppointmentStatusEmail({
        to: ownerProfile.email,
        businessName: businessOwner.name || "Tu negocio",
        serviceName: "Depósito enviado",
        startsAt: appt.starts_at,
        status: "payment_submitted"
      });
    }
  }

  await createBusinessNotification({
    businessId: appt.business_id,
    appointmentId: appt.id,
    kind: "payment_proof_submitted",
    payload: {
      title: "Deposito enviado",
      body: "El cliente envio comprobante de pago."
    }
  });

  return NextResponse.json({ ok: true, proofUrl: publicUrl });
}
