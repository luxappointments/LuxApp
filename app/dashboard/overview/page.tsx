 "use client";

import { useEffect, useMemo, useState } from "react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { getClientSupabase } from "@/lib/supabase/client";

export default function DashboardOverviewPage() {
  const { locale, tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    yesterdayAppointments: 0,
    noShowToday: 0,
    depositsToday: 0,
    deltaAppointments: 0,
    paidRevenueToday: 0,
    pendingRevenueToday: 0,
    estimatedRevenueToday: 0
  });
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    kind: string;
    payload?: { title?: string; body?: string };
    created_at: string;
    read_at?: string | null;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/dashboard/overview", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const payload = await res.json();
      if (res.ok) setStats(payload);

      const alertsRes = await fetch("/api/dashboard/alerts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const alertsPayload = await alertsRes.json();
      if (alertsRes.ok) setAlerts(alertsPayload.alerts || []);
      setAlertsLoading(false);
    })();
  }, [supabase]);

  const deltaLabel = stats.deltaAppointments === 0
    ? tx("sin cambio vs ayer", "no change vs yesterday")
    : `${stats.deltaAppointments > 0 ? "+" : ""}${stats.deltaAppointments}% ${tx("vs ayer", "vs yesterday")}`;

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Overview de hoy", "Today's overview")}</h1>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={tx("Citas hoy", "Today's appointments")} value={`${stats.todayAppointments}`} subtitle={deltaLabel} />
        <KpiCard title={tx("Ingresos estimados", "Estimated revenue")} value={`$${(stats.estimatedRevenueToday / 100).toFixed(2)}`} subtitle={tx("basado en reservas activas", "based on active bookings")} />
        <KpiCard title={tx("Pagadas", "Paid")} value={`$${(stats.paidRevenueToday / 100).toFixed(2)}`} subtitle={tx("confirmadas", "confirmed")} />
        <KpiCard title={tx("Pendientes", "Pending")} value={`$${(stats.pendingRevenueToday / 100).toFixed(2)}`} subtitle={tx("por cobrar", "to collect")} />
      </div>

      <Card>
        <h2 className="font-display text-2xl">{tx("Acciones rápidas", "Quick actions")}</h2>
        <div className="mt-3">
          <QuickActions />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{tx("Panel de alertas", "Alerts panel")}</h2>
        </div>
        {alertsLoading ? (
          <p className="mt-3 text-sm text-coolSilver">{tx("Cargando alertas...", "Loading alerts...")}</p>
        ) : alerts.length === 0 ? (
          <p className="mt-3 text-sm text-coolSilver">{tx("No hay alertas nuevas.", "No new alerts.")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-silver/20 bg-black/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-textWhite">{alert.payload?.title || alert.kind}</p>
                  <span className="text-xs text-mutedText">
                    {new Date(alert.created_at).toLocaleString(locale === "en" ? "en-US" : "es-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {alert.payload?.body ? <p className="mt-1 text-xs text-coolSilver">{alert.payload.body}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
