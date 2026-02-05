import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

export async function GET(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(addDays(now, -1));
  const yesterdayEnd = endOfDay(addDays(now, -1));

  const admin = getAdminSupabase();

  const [todayRes, yesterdayRes] = await Promise.all([
    admin
      .from("appointments")
      .select("id, status, required_deposit_cents, total_price_cents, paid_at")
      .eq("business_id", ctx.businessId)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString()),
    admin
      .from("appointments")
      .select("id, status")
      .eq("business_id", ctx.businessId)
      .gte("starts_at", yesterdayStart.toISOString())
      .lte("starts_at", yesterdayEnd.toISOString())
  ]);

  if (todayRes.error) return NextResponse.json({ error: todayRes.error.message }, { status: 400 });
  if (yesterdayRes.error) return NextResponse.json({ error: yesterdayRes.error.message }, { status: 400 });

  const today = todayRes.data || [];
  const yesterday = yesterdayRes.data || [];

  const todayAppointments = today.length;
  const yesterdayAppointments = yesterday.length;
  const noShowToday = today.filter((item) => item.status === "no_show").length;

  const depositsToday = today.reduce((acc, item: any) => {
    if (!item.paid_at) return acc;
    return acc + (item.required_deposit_cents || 0);
  }, 0);

  const paidRevenueToday = today
    .filter((item: any) => item.status === "paid" || item.status === "completed")
    .reduce((acc, item: any) => acc + (item.total_price_cents || 0), 0);

  const pendingRevenueToday = today
    .filter((item: any) => ["pending_confirmation", "confirmed", "awaiting_payment"].includes(item.status))
    .reduce((acc, item: any) => acc + (item.total_price_cents || 0), 0);

  const estimatedRevenueToday = today
    .filter((item: any) => !["canceled_by_client", "canceled_by_business", "no_show"].includes(item.status))
    .reduce((acc, item: any) => acc + (item.total_price_cents || 0), 0);

  const deltaAppointments = yesterdayAppointments === 0
    ? todayAppointments > 0 ? 100 : 0
    : Math.round(((todayAppointments - yesterdayAppointments) / yesterdayAppointments) * 100);

  return NextResponse.json({
    todayAppointments,
    yesterdayAppointments,
    noShowToday,
    depositsToday,
    deltaAppointments,
    paidRevenueToday,
    pendingRevenueToday,
    estimatedRevenueToday
  });
}
