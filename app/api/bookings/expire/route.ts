import { NextResponse } from "next/server";

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
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "canceled_by_business", cancel_reason: "payment_timeout" })
    .eq("status", "awaiting_payment")
    .lt("payment_due_at", now)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length || 0 });
}
