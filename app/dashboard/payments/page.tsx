"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

const defaults = {
  deposit_mode: "none",
  base_deposit_percent: 0,
  fixed_deposit_cents: null as number | null,
  pay_later_allowed: true,
  external_payments_enabled: true,
  accepted_methods: ["stripe", "cash"] as Array<"stripe" | "cash" | "zelle" | "paypal" | "cashapp" | "other">,
  method_details: {} as Record<
    "stripe" | "cash" | "zelle" | "paypal" | "cashapp" | "other",
    { account_label?: string; account_value?: string; payment_url?: string; notes?: string }
  >
};

export default function PaymentsPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const methodOptions = [
    ["stripe", tx("Tarjeta (Stripe)", "Card (Stripe)")],
    ["zelle", "Zelle"],
    ["paypal", "PayPal"],
    ["cashapp", "Cash App"],
    ["cash", tx("Cash al momento", "Cash on site")],
    ["other", tx("Otro método", "Other method")]
  ] as const;

  function getPlaceholder(method: string) {
    if (method === "zelle") return tx("email o teléfono en Zelle", "Zelle email or phone");
    if (method === "paypal") return tx("usuario PayPal o correo", "PayPal username or email");
    if (method === "cashapp") return "$cashtag";
    if (method === "cash") return tx("Instrucciones de pago en efectivo", "Cash payment instructions");
    if (method === "stripe") return tx("Cuenta Stripe conectada", "Stripe account connected");
    return tx("Detalle de pago", "Payment detail");
  }
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

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/dashboard/payments", { headers: await authHeaders() });
      const payload = await res.json();
      if (res.ok && payload.payments) {
        setForm({ ...defaults, ...payload.payments });
      } else if (!res.ok) {
        setMessage(payload.error || tx("No se pudieron cargar opciones de pago.", "Could not load payment options."));
      }
      setLoading(false);
    }

    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/dashboard/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify(form)
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo guardar configuración de pagos.", "Could not save payment settings."));
      setSaving(false);
      return;
    }

    setForm({ ...defaults, ...payload.payments });
    setMessage(tx("Opciones de pagos actualizadas.", "Payment options updated."));
    setSaving(false);
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Pagos", "Payments")}</h1>
      <Card>
        {loading ? (
          <p className="text-coolSilver">{tx("Cargando...", "Loading...")}</p>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm text-coolSilver">
              <p className="text-softGold">{tx("Depósito para reservar", "Deposit to book")}</p>
              <p>{tx("Aquí defines cuánto debe pagar el cliente para apartar la cita.", "Here you define how much the client must pay to hold the appointment.")}</p>
              <p><strong>{tx("Depósito %", "Deposit %")}</strong> {tx("se usa cuando el modo es", "is used when the mode is")} <strong>percent</strong>.</p>
              <p><strong>{tx("Depósito fijo", "Fixed deposit")}</strong> {tx("se usa cuando el modo es", "is used when the mode is")} <strong>fixed</strong>.</p>
            </div>

            <label className="block text-sm text-coolSilver">
              {tx("Modo de depósito", "Deposit mode")}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-silver/20 bg-richBlack/80 px-3 text-textWhite"
                value={form.deposit_mode}
                onChange={(e) => setForm({ ...form, deposit_mode: e.target.value })}
              >
                <option value="none">{tx("Sin depósito", "No deposit")}</option>
                <option value="fixed">{tx("Depósito fijo", "Fixed deposit")}</option>
                <option value="percent">{tx("Depósito por porcentaje", "Percentage deposit")}</option>
                <option value="full">{tx("Pago completo", "Full payment")}</option>
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-coolSilver">
                {tx("Depósito % (0-100)", "Deposit % (0-100)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  max={100}
                  placeholder={tx("Ej: 30", "Ex: 30")}
                  value={form.base_deposit_percent}
                  onChange={(e) => setForm({ ...form, base_deposit_percent: Number(e.target.value || 0) })}
                />
              </label>
              <label className="text-sm text-coolSilver">
                {tx("Depósito fijo (USD)", "Fixed deposit (USD)")}
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  placeholder={tx("Ej: 25", "Ex: 25")}
                  value={(form.fixed_deposit_cents || 0) / 100}
                  onChange={(e) => setForm({ ...form, fixed_deposit_cents: Math.round(Number(e.target.value || 0) * 100) })}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-coolSilver">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.pay_later_allowed} onChange={(e) => setForm({ ...form, pay_later_allowed: e.target.checked })} />
                {tx("Permitir pagar después", "Allow pay later")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.external_payments_enabled} onChange={(e) => setForm({ ...form, external_payments_enabled: e.target.checked })} />
                {tx("Aceptar pagos externos (Cash/Zelle/PayPal)", "Accept external payments (Cash/Zelle/PayPal)")}
              </label>
            </div>

            <div className="rounded-2xl border border-silver/20 bg-black/40 p-3">
              <p className="mb-2 text-sm text-softGold">{tx("Métodos de pago que acepta tu negocio", "Payment methods your business accepts")}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {methodOptions.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-coolSilver">
                    <input
                      type="checkbox"
                      checked={form.accepted_methods.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((prev) => ({ ...prev, accepted_methods: [...prev.accepted_methods, value] }));
                        } else {
                          const next = form.accepted_methods.filter((item) => item !== value);
                          if (next.length === 0) return;
                          setForm((prev) => ({ ...prev, accepted_methods: next }));
                        }
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {form.accepted_methods.map((method) => (
                <div key={method} className="rounded-2xl border border-silver/20 bg-black/40 p-3">
                  <p className="text-sm text-softGold">{methodOptions.find(([value]) => value === method)?.[1] || method}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder={getPlaceholder(method)}
                      value={form.method_details?.[method]?.account_value || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          method_details: {
                            ...prev.method_details,
                            [method]: { ...prev.method_details?.[method], account_value: e.target.value }
                          }
                        }))
                      }
                    />
                    <Input
                      placeholder={tx("Link de pago (opcional)", "Payment link (optional)")}
                      value={form.method_details?.[method]?.payment_url || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          method_details: {
                            ...prev.method_details,
                            [method]: { ...prev.method_details?.[method], payment_url: e.target.value }
                          }
                        }))
                      }
                    />
                  </div>
                  <Input
                    className="mt-2"
                    placeholder={tx("Notas para el cliente (opcional)", "Notes for the client (optional)")}
                    value={form.method_details?.[method]?.notes || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        method_details: {
                          ...prev.method_details,
                          [method]: { ...prev.method_details?.[method], notes: e.target.value }
                        }
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <Button type="submit" disabled={saving}>{saving ? tx("Guardando...", "Saving...") : tx("Guardar pagos", "Save payments")}</Button>
          </form>
        )}
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
