import { addHours } from "date-fns";
import { NextResponse } from "next/server";

import { sendReminderEmail } from "@/lib/notifications/email";
import { getAdminSupabase } from "@/lib/supabase/admin";

function requireCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: "Falta CRON_SECRET en .env.local" };
  const header = req.headers.get("x-cron-secret") || "";
  if (header !== secret) return { ok: false, error: "No autorizado" };
  return { ok: true };
}

export async function POST(req: Request) {
  const auth = requireCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const supabase = getAdminSupabase();
  const now = new Date();

  const windows = [24, 2] as const;

  for (const hours of windows) {
    const targetStart = addHours(now, hours - 1).toISOString();
    const targetEnd = addHours(now, hours + 1).toISOString();

    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, client_email, starts_at, businesses(name), services(name)")
      .in("status", ["confirmed", "paid"])
      .gte("starts_at", targetStart)
      .lte("starts_at", targetEnd);

    for (const item of appointments || []) {
      await sendReminderEmail(
        {
          to: item.client_email,
          businessName: (item as any).businesses?.name || "Negocio",
          serviceName: (item as any).services?.name || "Servicio",
          startsAt: item.starts_at,
          status: "confirmed"
        },
        hours
      );
    }
  }

  return NextResponse.json({ ok: true });
}
