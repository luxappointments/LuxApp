"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  category?: string | null;
  description: string | null;
  duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  price_cents: number;
  price_starts_at: boolean;
  image_url?: string | null;
  requires_confirmation: boolean;
  requires_payment: boolean;
  is_active: boolean;
};

const emptyForm = {
  id: "",
  name: "",
  category: "",
  description: "",
  duration_min: 30,
  buffer_before_min: 0,
  buffer_after_min: 0,
  price_cents: 0,
  price_starts_at: false,
  requires_confirmation: false,
  requires_payment: false
};

export default function ServicesPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const categories = Array.from(
    new Set(services.map((item) => item.category).filter((value): value is string => Boolean(value)))
  );

  async function getAuthHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function loadServices() {
    setLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/dashboard/services", { headers });
    const payload = await res.json();

    if (!res.ok) {
      setMessage(payload.error || tx("No se pudieron cargar servicios.", "Could not load services."));
      setLoading(false);
      return;
    }

    setServices((payload.services || []).filter((item: Service) => item.is_active));
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const headers = {
      "Content-Type": "application/json",
      ...(await getAuthHeader())
    };

    const method = form.id ? "PUT" : "POST";
    const res = await fetch("/api/dashboard/services", {
      method,
      headers,
      body: JSON.stringify(form)
    });

    const payload = await res.json();
    if (!res.ok) {
      setSaving(false);
      setMessage(payload.error || tx("No se pudo guardar el servicio.", "Could not save service."));
      return;
    }

    setForm(emptyForm);
    setSaving(false);
    setMessage(form.id ? tx("Servicio actualizado.", "Service updated.") : tx("Servicio creado.", "Service created."));
    await loadServices();
  }

  async function onDelete(id: string) {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/dashboard/services?id=${id}`, { method: "DELETE", headers });
    const payload = await res.json();

    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo eliminar el servicio.", "Could not delete service."));
      return;
    }

    setMessage(tx("Servicio desactivado.", "Service deactivated."));
    await loadServices();
  }

  async function onUploadServiceImage(id: string, file: File) {
    try {
      setUploadingId(id);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const formData = new FormData();
      formData.append("kind", "service_image");
      formData.append("serviceId", id);
      formData.append("file", file);

      const res = await fetch("/api/dashboard/business-assets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || tx("No se pudo subir imagen de servicio.", "Could not upload service image."));
        return;
      }

      setMessage(tx("Imagen de servicio actualizada.", "Service image updated."));
      await loadServices();
    } catch {
      setMessage(tx("La subida fue abortada. Intenta con una imagen más ligera (JPG/PNG).", "Upload failed or was aborted. Try a lighter image (JPG/PNG)."));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Servicios", "Services")}</h1>

      <Card>
        <div className="mb-4 rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm text-coolSilver">
          <p className="text-softGold">{tx("Cómo configurar", "How to configure")}</p>
          <p>{tx("1) Aquí defines nombre, duración y precio del servicio.", "1) Define name, duration, and price of the service here.")}</p>
          <p>{tx("2) El porcentaje de depósito se configura en la pantalla", "2) Deposit percentage is configured on the")} <strong>{tx("Pagos", "Payments")}</strong>.</p>
          <p>{tx("3) Si activas \"Requiere pago\", la cita puede pasar a", "3) If you enable \"Requires payment\", the appointment can move to")} <code>awaiting_payment</code>.</p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-coolSilver">
              {tx("Nombre del servicio", "Service name")}
              <Input className="mt-1" placeholder={tx("Ej: Full Set Gel X", "Ex: Full Set Gel X")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="text-sm text-coolSilver">
              {tx("Precio del servicio (USD)", "Service price (USD)")}
              <Input className="mt-1" placeholder={tx("Ej: 85", "Ex: 85")} type="number" min={0} value={form.price_cents / 100} onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value || 0) * 100) })} required />
            </label>
          </div>
          <label className="text-sm text-coolSilver">
            {tx("Categoría (opcional)", "Category (optional)")}
            <Input
              className="mt-1"
              placeholder={tx("Ej: Uñas manos, Uñas pies", "Ex: Nails hands, Nails feet")}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              list="service-categories"
            />
          </label>
          <datalist id="service-categories">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <label className="text-sm text-coolSilver">
            {tx("Descripción (opcional)", "Description (optional)")}
            <Input className="mt-1" placeholder={tx("Describe qué incluye este servicio", "Describe what this service includes")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-coolSilver">
            <input type="checkbox" checked={form.price_starts_at} onChange={(e) => setForm({ ...form, price_starts_at: e.target.checked })} />
            {tx("Precio desde (el costo puede variar)", "Starting price (final cost may vary)")}
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-coolSilver">
              {tx("Duración (min)", "Duration (min)")}
              <Input className="mt-1" placeholder={tx("Ej: 60", "Ex: 60")} type="number" min={5} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value || 0) })} required />
            </label>
            <label className="text-sm text-coolSilver">
              {tx("Buffer antes (min)", "Buffer before (min)")}
              <Input className="mt-1" placeholder={tx("Ej: 10", "Ex: 10")} type="number" min={0} value={form.buffer_before_min} onChange={(e) => setForm({ ...form, buffer_before_min: Number(e.target.value || 0) })} required />
            </label>
            <label className="text-sm text-coolSilver">
              {tx("Buffer después (min)", "Buffer after (min)")}
              <Input className="mt-1" placeholder={tx("Ej: 10", "Ex: 10")} type="number" min={0} value={form.buffer_after_min} onChange={(e) => setForm({ ...form, buffer_after_min: Number(e.target.value || 0) })} required />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-coolSilver">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.requires_confirmation} onChange={(e) => setForm({ ...form, requires_confirmation: e.target.checked })} />
              {tx("Requiere confirmación", "Requires confirmation")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.requires_payment} onChange={(e) => setForm({ ...form, requires_payment: e.target.checked })} />
              {tx("Requiere pago", "Requires payment")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? tx("Guardando...", "Saving...") : form.id ? tx("Actualizar servicio", "Update service") : tx("Crear servicio", "Create service")}</Button>
            {form.id ? (
              <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>
                {tx("Cancelar edición", "Cancel edit")}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-2xl">{tx("Lista de servicios", "Service list")}</h2>
        {loading ? <p className="mt-3 text-coolSilver">{tx("Cargando...", "Loading...")}</p> : null}
        <div className="mt-3 space-y-2">
          {services.map((service) => (
            <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-silver/20 bg-black/40 p-3 text-sm">
              <div>
                <p className="text-textWhite">
                  {service.name} · {service.price_starts_at ? `${tx("Desde", "From")} $${(service.price_cents / 100).toFixed(2)}` : `$${(service.price_cents / 100).toFixed(2)}`}
                </p>
                {service.category ? <p className="text-xs text-softGold">{service.category}</p> : null}
                <p className="text-mutedText">{service.duration_min} min · {tx("buffers", "buffers")} {service.buffer_before_min}/{service.buffer_after_min}</p>
                <div className="mt-2 flex items-center gap-3">
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.name} className="h-12 w-12 rounded-xl border border-silver/30 object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-silver/30 text-xs text-coolSilver">
                      {tx("Sin foto", "No photo")}
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingId === service.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      onUploadServiceImage(service.id, file);
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setForm({
                  id: service.id,
                  name: service.name,
                  category: service.category || "",
                  description: service.description || "",
                  duration_min: service.duration_min,
                  buffer_before_min: service.buffer_before_min,
                  buffer_after_min: service.buffer_after_min,
                  price_cents: service.price_cents,
                  price_starts_at: service.price_starts_at,
                  requires_confirmation: service.requires_confirmation,
                  requires_payment: service.requires_payment
                })}>{tx("Editar", "Edit")}</Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(service.id)}>{tx("Desactivar", "Deactivate")}</Button>
              </div>
            </div>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
