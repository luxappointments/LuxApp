 "use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { getClientSupabase } from "@/lib/supabase/client";

type AppointmentItem = {
  id: string;
  starts_at: string;
  status: string;
  required_deposit_cents: number | null;
  total_price_cents: number | null;
  external_payment_status?: string | null;
  external_payment_proof_url?: string | null;
  external_payment_method?: string | null;
  businesses?: { id: string; name: string; slug: string; logo_url?: string | null } | null;
};

export default function ClientAppointmentsPage() {
  const { tx, locale } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [methodsByBusiness, setMethodsByBusiness] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [methodById, setMethodById] = useState<Record<string, string>>({});

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    return headers;
  }

  async function loadAppointments() {
    const res = await fetch("/api/client/appointments", { headers: await authHeaders() });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudieron cargar tus citas.", "Could not load your appointments."));
    } else {
      setAppointments(payload.appointments || []);
      setMethodsByBusiness(payload.methodsByBusiness || {});
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function submitProof(appointmentId: string, businessId: string, file: File) {
    try {
      setUploadingId(appointmentId);
      setMessage(null);
      const formData = new FormData();
      formData.append("appointmentId", appointmentId);
      formData.append("method", methodById[appointmentId] || "");
      formData.append("file", file);

      const res = await fetch("/api/client/appointments/payment-proof", {
        method: "POST",
        headers: await authHeaders(),
        body: formData
      });

      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || tx("No se pudo enviar el comprobante.", "Could not submit proof."));
        return;
      }

      setMessage(tx("Comprobante enviado. El negocio lo confirmará.", "Proof sent. The business will confirm it."));
      await loadAppointments();
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <Card>
      <h1 className="font-display text-3xl">{tx("Mis citas activas", "My active appointments")}</h1>
      {loading ? <p className="mt-4 text-coolSilver">{tx("Cargando...", "Loading...")}</p> : null}
      <div className="mt-4 space-y-3">
        {appointments.map((item) => {
          const business = item.businesses;
          const methods = business?.id ? methodsByBusiness[business.id] || [] : [];
          const deposit = item.required_deposit_cents || 0;
          const total = item.total_price_cents || 0;
          return (
            <div key={item.id} className="rounded-xl border border-silver/20 bg-black/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {business?.logo_url ? (
                    <img src={business.logo_url} alt={business.name} className="h-12 w-12 rounded-2xl object-cover" />
                  ) : null}
                  <div>
                    <p className="text-textWhite">{business?.name || "-"}</p>
                    <p className="text-sm text-mutedText">
                      {new Date(item.starts_at).toLocaleString(locale === "en" ? "en-US" : "es-US")}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-softGold">{item.status}</span>
              </div>

              <div className="mt-2 text-sm text-coolSilver">
                <p>{tx("Total", "Total")}: ${(total / 100).toFixed(2)}</p>
                <p>{tx("Depósito requerido", "Required deposit")}: ${(deposit / 100).toFixed(2)}</p>
              </div>

              {item.status === "awaiting_payment" ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-softGold">{tx("Indica que ya pagaste el depósito", "Let us know you paid the deposit")}</p>
                  {methods.length ? (
                    <select
                      className="h-11 w-full rounded-2xl border border-silver/20 bg-richBlack/80 px-3 text-textWhite"
                      value={methodById[item.id] || ""}
                      onChange={(e) => setMethodById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    >
                      <option value="">{tx("Selecciona método", "Select method")}</option>
                      {methods.map((m: any) => (
                        <option key={`${item.id}-${m.method}`} value={m.method}>
                          {m.method}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-silver/20 bg-richBlack/80 px-4 py-3 text-sm text-coolSilver hover:border-softGold">
                    <span>{tx("Subir comprobante", "Upload proof")}</span>
                    <span className="rounded-xl border border-gold/30 px-3 py-1 text-xs text-softGold">{tx("Elegir archivo", "Choose file")}</span>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      disabled={uploadingId === item.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !business?.id) return;
                        submitProof(item.id, business.id, file);
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
    </Card>
  );
}
