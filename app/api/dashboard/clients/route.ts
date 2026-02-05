import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const updateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_frequent: z.boolean().optional(),
  force_prepay: z.boolean().optional(),
  soft_blacklist: z.boolean().optional(),
  reason: z.string().optional(),
  expires_at: z.string().datetime().nullable().optional()
});

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const admin = getAdminSupabase();

  const [
    { data: appts, error: apptsError },
    { data: stats, error: statsError },
    { data: blacklists, error: blError },
    { data: manualClients, error: manualError },
    { data: reminders, error: remindersError },
    { data: deletedClients, error: deletedError }
  ] = await Promise.all([
    admin
      .from("appointments")
      .select("id, client_email, customer_id, starts_at, status")
      .eq("business_id", ctx.businessId)
      .order("starts_at", { ascending: false }),
    admin
      .from("customer_business_stats")
      .select("customer_email, strikes, force_prepay")
      .eq("business_id", ctx.businessId),
    admin
      .from("soft_blacklist")
      .select("customer_email, reason, expires_at, active")
      .eq("scope", "business")
      .eq("business_id", ctx.businessId)
      .eq("active", true),
    admin
      .from("business_clients")
      .select("email, full_name, phone, notes, is_frequent, updated_at")
      .eq("business_id", ctx.businessId),
    admin
      .from("business_client_reminders")
      .select("id, client_email, note, remind_at, status, created_at")
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: false }),
    admin
      .from("business_deleted_clients")
      .select("email, deleted_at")
      .eq("business_id", ctx.businessId)
  ]);

  if (apptsError) return NextResponse.json({ error: apptsError.message }, { status: 400 });
  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 400 });
  if (blError) return NextResponse.json({ error: blError.message }, { status: 400 });
  if (manualError) return NextResponse.json({ error: manualError.message }, { status: 400 });
  if (remindersError) return NextResponse.json({ error: remindersError.message }, { status: 400 });
  if (deletedError) return NextResponse.json({ error: deletedError.message }, { status: 400 });

  const emails = Array.from(new Set((appts || []).map((a) => a.client_email)));
  const userIds = Array.from(new Set((appts || []).map((a) => a.customer_id).filter(Boolean)));

  const [{ data: profilesByEmail }, { data: profilesById }] = await Promise.all([
    emails.length > 0 ? admin.from("profiles").select("id, email, full_name, avatar_url").in("email", emails) : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0 ? admin.from("profiles").select("id, email, full_name, avatar_url").in("id", userIds as string[]) : Promise.resolve({ data: [] as any[] })
  ]);

  const profileMapByEmail = new Map<string, any>((profilesByEmail || []).map((p) => [p.email, p]));
  const profileMapById = new Map<string, any>((profilesById || []).map((p) => [p.id, p]));
  const statsMap = new Map<string, any>((stats || []).map((s) => [s.customer_email, s]));
  const blMap = new Map<string, any>((blacklists || []).map((b) => [b.customer_email, b]));
  const manualMap = new Map<string, any>((manualClients || []).map((c) => [c.email, c]));
  const reminderMap = new Map<string, any[]>();
  for (const reminder of reminders || []) {
    const list = reminderMap.get(reminder.client_email) || [];
    list.push(reminder);
    reminderMap.set(reminder.client_email, list);
  }
  const deletedMap = new Map<string, string>((deletedClients || []).map((d) => [d.email, d.deleted_at]));

  const grouped = new Map<string, any>();

  for (const manual of manualClients || []) {
    const deletedAt = deletedMap.get(manual.email);
    if (deletedAt) continue;
      grouped.set(manual.email, {
      email: manual.email,
      full_name: manual.full_name || manual.email,
      avatar_url: null,
      phone: manual.phone || null,
      notes: manual.notes || null,
      is_frequent: Boolean(manual.is_frequent),
      total_appointments: 0,
      completed_count: 0,
      no_show_count: 0,
      last_appointment_at: null,
      strikes: statsMap.get(manual.email)?.strikes || 0,
      force_prepay: Boolean(statsMap.get(manual.email)?.force_prepay),
      soft_blacklist: Boolean(blMap.get(manual.email)),
        blacklist_reason: blMap.get(manual.email)?.reason || null,
        blacklist_expires_at: blMap.get(manual.email)?.expires_at || null,
        reminders: reminderMap.get(manual.email) || []
      });
  }

  for (const appt of appts || []) {
    const email = appt.client_email;
    const deletedAt = deletedMap.get(email);
    if (deletedAt && new Date(appt.starts_at) <= new Date(deletedAt)) {
      continue;
    }
    const profile = (appt.customer_id && profileMapById.get(appt.customer_id)) || profileMapByEmail.get(email);
    if (!grouped.has(email)) {
      grouped.set(email, {
        email,
        full_name: manualMap.get(email)?.full_name || profile?.full_name || email,
        avatar_url: profile?.avatar_url || null,
        phone: manualMap.get(email)?.phone || null,
        notes: manualMap.get(email)?.notes || null,
        is_frequent: Boolean(manualMap.get(email)?.is_frequent),
        total_appointments: 0,
        completed_count: 0,
        no_show_count: 0,
        last_appointment_at: appt.starts_at,
        strikes: statsMap.get(email)?.strikes || 0,
        force_prepay: Boolean(statsMap.get(email)?.force_prepay),
        soft_blacklist: Boolean(blMap.get(email)),
        blacklist_reason: blMap.get(email)?.reason || null,
        blacklist_expires_at: blMap.get(email)?.expires_at || null,
        reminders: reminderMap.get(email) || []
      });
    }

    const item = grouped.get(email);
    item.total_appointments += 1;
    if (appt.status === "completed") item.completed_count += 1;
    if (appt.status === "no_show") item.no_show_count += 1;
  }

  const clients = Array.from(grouped.values()).sort((a, b) => b.total_appointments - a.total_appointments);

  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const input = parsed.data;

  if (input.full_name || input.phone || input.notes || typeof input.is_frequent === "boolean") {
    const { error: clientError } = await admin
      .from("business_clients")
      .upsert(
        {
          business_id: ctx.businessId,
          email: input.email,
          full_name: input.full_name || null,
          phone: input.phone || null,
          notes: input.notes || null,
          is_frequent: Boolean(input.is_frequent)
        },
        { onConflict: "business_id,email" }
      );

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 400 });
  }

  if (typeof input.force_prepay === "boolean") {
    const { data: existing } = await admin
      .from("customer_business_stats")
      .select("strikes")
      .eq("business_id", ctx.businessId)
      .eq("customer_email", input.email)
      .maybeSingle();

    const { error: statError } = await admin
      .from("customer_business_stats")
      .upsert(
        {
          business_id: ctx.businessId,
          customer_email: input.email,
          strikes: existing?.strikes || 0,
          force_prepay: input.force_prepay,
          last_strike_at: existing ? undefined : null
        },
        { onConflict: "business_id,customer_email" }
      );

    if (statError) return NextResponse.json({ error: statError.message }, { status: 400 });
  }

  if (typeof input.soft_blacklist === "boolean") {
    await admin
      .from("soft_blacklist")
      .update({ active: false })
      .eq("scope", "business")
      .eq("business_id", ctx.businessId)
      .eq("customer_email", input.email)
      .eq("active", true);

    if (input.soft_blacklist) {
      const { error: blInsertError } = await admin.from("soft_blacklist").insert({
        scope: "business",
        business_id: ctx.businessId,
        customer_email: input.email,
        reason: input.reason || null,
        expires_at: input.expires_at || null,
        active: true,
        created_by: ctx.userId
      });

      if (blInsertError) return NextResponse.json({ error: blInsertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const admin = getAdminSupabase();
  await admin
    .from("business_deleted_clients")
    .upsert({ business_id: ctx.businessId, email, deleted_at: new Date().toISOString() });

  const { error: deleteClientError } = await admin
    .from("business_clients")
    .delete()
    .eq("business_id", ctx.businessId)
    .eq("email", email);

  if (deleteClientError) return NextResponse.json({ error: deleteClientError.message }, { status: 400 });

  await admin
    .from("business_client_reminders")
    .delete()
    .eq("business_id", ctx.businessId)
    .eq("client_email", email);

  return NextResponse.json({ ok: true });
}
