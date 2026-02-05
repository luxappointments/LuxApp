"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { getClientSupabase } from "@/lib/supabase/client";

type BusinessItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  category: string;
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  created_at: string;
  is_active: boolean;
};

export default function AdminPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [transferBusinessId, setTransferBusinessId] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    return headers;
  }

  async function loadBusinesses() {
    const res = await fetch("/api/admin/overview", { headers: await authHeaders() });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudieron cargar negocios.", "Could not load businesses."));
    } else {
      setBusinesses(payload.businesses || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function transferBusiness() {
    if (!transferBusinessId || !transferEmail) {
      setMessage(tx("Completa negocio y email.", "Provide business and email."));
      return;
    }
    const res = await fetch("/api/admin/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ businessId: transferBusinessId, newOwnerEmail: transferEmail })
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo transferir.", "Could not transfer."));
      return;
    }
    setMessage(tx("Transferencia completada.", "Transfer completed."));
    setTransferBusinessId("");
    setTransferEmail("");
    await loadBusinesses();
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Admin global", "Global admin")}</h1>
      <Card>
        <h2 className="font-display text-2xl">{tx("Transferir negocio", "Transfer business")}</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder={tx("ID del negocio", "Business ID")}
            value={transferBusinessId}
            onChange={(e) => setTransferBusinessId(e.target.value)}
          />
          <Input
            placeholder={tx("Email nuevo dueño", "New owner email")}
            value={transferEmail}
            onChange={(e) => setTransferEmail(e.target.value)}
          />
          <Button onClick={transferBusiness}>{tx("Transferir", "Transfer")}</Button>
        </div>
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>

      <Card>
        <h2 className="font-display text-2xl">{tx("Negocios", "Businesses")}</h2>
        {loading ? <p className="text-coolSilver">{tx("Cargando...", "Loading...")}</p> : null}
        <div className="mt-3 space-y-2 text-sm text-coolSilver">
          {businesses.map((biz) => (
            <div key={biz.id} className="rounded-2xl border border-silver/20 bg-black/40 p-3">
              <p className="text-textWhite">{biz.name}</p>
              <p className="text-xs text-mutedText">{biz.city} · {biz.category} · {biz.slug}</p>
              <p className="text-xs text-coolSilver">
                {tx("Owner", "Owner")}: {biz.owner_email || biz.owner_name || biz.owner_id}
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => {
                  setTransferBusinessId(biz.id);
                }}>
                  {tx("Usar ID", "Use ID")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
