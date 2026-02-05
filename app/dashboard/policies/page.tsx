"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { getClientSupabase } from "@/lib/supabase/client";

const defaults = {
  auto_confirm: false,
  min_cancel_minutes: 240,
  late_cancel_minutes: 120,
  late_tolerance_minutes: 10,
  no_show_strike_limit: 2,
  strike_window_days: 90,
  booking_lead_days: 0,
  deposit_mode: "none",
  base_deposit_percent: 0,
  fixed_deposit_cents: null as number | null,
  pay_later_allowed: true,
  external_payments_enabled: true
};

export default function PoliciesPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    return headers;
  }

  const minCancelHours = Math.round(form.min_cancel_minutes / 60);
  const lateCancelHours = Math.round(form.late_cancel_minutes / 60);

  useEffect(() => {
    async function load() {
      const headers = await authHeaders();
      const res = await fetch("/api/dashboard/policies", { headers });
      const payload = await res.json();
      if (res.ok && payload.policies) {
        setForm({ ...defaults, ...payload.policies });
      } else if (!res.ok) {
        setMessage(payload.error || tx("No se pudieron cargar políticas.", "Could not load policies."));
      }
      setLoading(false);
    }

    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/dashboard/policies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify(form)
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo guardar.", "Could not save."));
      setSaving(false);
      return;
    }

    setForm({ ...defaults, ...payload.policies });
    setMessage(tx("Políticas actualizadas.", "Policies updated."));
    setSaving(false);
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Políticas del negocio", "Business policies")}</h1>
      <Card>
        {loading ? (
          <p className="text-coolSilver">{tx("Cargando políticas...", "Loading policies...")}</p>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm text-coolSilver">
              <p className="text-softGold">{tx("Guía rápida de políticas", "Quick policy guide")}</p>
              <p><strong>{tx("Cancelación mínima (horas)", "Minimum cancellation (hours)")}:</strong> {tx("cuántas horas antes el cliente puede cancelar sin penalidad.", "how many hours in advance clients can cancel without penalty.")}</p>
              <p><strong>{tx("Reembolso depósito", "Deposit refund")}:</strong> {tx("solo aplica si el cliente cancela antes de ese límite.", "only applies if the client cancels before that limit.")}</p>
              <p><strong>{tx("Late cancel (horas)", "Late cancel (hours)")}:</strong> {tx("dentro de este rango cuenta como cancelación tardía y puede generar strike.", "inside this range it counts as a late cancellation and can generate a strike.")}</p>
              <p><strong>{tx("Tolerancia tardanza (min)", "Late tolerance (min)")}:</strong> {tx("minutos de gracia antes de marcar no-show.", "grace minutes before marking a no-show.")}</p>
              <p><strong>{tx("Límite strikes", "Strike limit")}:</strong> {tx("cuántos strikes activan pre-pago obligatorio.", "how many strikes trigger mandatory pre-payment.")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-coolSilver">
                {tx("Cancelación mínima (horas)", "Minimum cancellation (hours)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={minCancelHours}
                  onChange={(e) => setForm({ ...form, min_cancel_minutes: Number(e.target.value || 0) * 60 })}
                  placeholder={tx("Ej: 24", "Ex: 24")}
                />
              </label>
              <label className="text-sm text-coolSilver">
                {tx("Ventana late cancel (horas)", "Late cancel window (hours)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={lateCancelHours}
                  onChange={(e) => setForm({ ...form, late_cancel_minutes: Number(e.target.value || 0) * 60 })}
                  placeholder={tx("Ej: 12", "Ex: 12")}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-coolSilver">
                {tx("Tolerancia de tardanza (min)", "Late tolerance (min)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={form.late_tolerance_minutes}
                  onChange={(e) => setForm({ ...form, late_tolerance_minutes: Number(e.target.value || 0) })}
                  placeholder={tx("Ej: 10", "Ex: 10")}
                />
              </label>
              <label className="text-sm text-coolSilver">
                {tx("Límite de strikes", "Strike limit")}
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  value={form.no_show_strike_limit}
                  onChange={(e) => setForm({ ...form, no_show_strike_limit: Number(e.target.value || 0) })}
                  placeholder={tx("Ej: 2", "Ex: 2")}
                />
              </label>
              <label className="text-sm text-coolSilver">
                {tx("Ventana de strikes (días)", "Strikes window (days)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  value={form.strike_window_days}
                  onChange={(e) => setForm({ ...form, strike_window_days: Number(e.target.value || 0) })}
                  placeholder={tx("Ej: 90", "Ex: 90")}
                />
              </label>
              <label className="text-sm text-coolSilver">
                {tx("Antelación mínima (días)", "Minimum advance (days)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  max={30}
                  value={form.booking_lead_days}
                  onChange={(e) => setForm({ ...form, booking_lead_days: Number(e.target.value || 0) })}
                  placeholder={tx("Ej: 2", "Ex: 2")}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-coolSilver">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.auto_confirm} onChange={(e) => setForm({ ...form, auto_confirm: e.target.checked })} />
                {tx("Auto confirmar citas", "Auto-confirm appointments")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.pay_later_allowed} onChange={(e) => setForm({ ...form, pay_later_allowed: e.target.checked })} />
                {tx("Permitir pay later", "Allow pay later")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.external_payments_enabled} onChange={(e) => setForm({ ...form, external_payments_enabled: e.target.checked })} />
                {tx("Permitir pagos externos", "Allow external payments")}
              </label>
            </div>
            <Button type="submit" disabled={saving}>{saving ? tx("Guardando...", "Saving...") : tx("Guardar políticas", "Save policies")}</Button>
          </form>
        )}
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
