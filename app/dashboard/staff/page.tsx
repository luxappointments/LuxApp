"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

type Staff = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export default function StaffPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", display_name: "", bio: "" });

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    return headers;
  }

  async function loadStaff() {
    const res = await fetch("/api/dashboard/staff", { headers: await authHeaders() });
    const payload = await res.json();
    if (res.ok) setStaff(payload.staff || []);
    else setMessage(payload.error || tx("No se pudo cargar staff.", "Could not load staff."));
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const method = form.id ? "PUT" : "POST";
    const res = await fetch("/api/dashboard/staff", {
      method,
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(form)
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo guardar staff.", "Could not save staff."));
      setSaving(false);
      return;
    }

    setForm({ id: "", display_name: "", bio: "" });
    setSaving(false);
    setMessage(form.id ? tx("Staff actualizado.", "Staff updated.") : tx("Staff agregado.", "Staff added."));
    await loadStaff();
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/dashboard/staff?id=${id}`, { method: "DELETE", headers: await authHeaders() });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo eliminar staff.", "Could not delete staff."));
      return;
    }
    setMessage(tx("Staff desactivado.", "Staff deactivated."));
    await loadStaff();
  }

  async function onUploadAvatar(id: string, file: File) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const formData = new FormData();
      formData.append("kind", "staff_avatar");
      formData.append("staffId", id);
      formData.append("file", file);

      const res = await fetch("/api/dashboard/business-assets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || tx("No se pudo subir foto de staff.", "Could not upload staff photo."));
        return;
      }

      setMessage(tx("Foto de staff actualizada.", "Staff photo updated."));
      await loadStaff();
    } catch {
      setMessage(tx("La subida fue abortada. Intenta con una imagen más ligera (JPG/PNG).", "Upload failed or was aborted. Try a lighter image (JPG/PNG)."));
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Staff", "Staff")}</h1>
      <Card>
        <p className="mb-3 text-sm text-coolSilver">{tx("Agrega staff. Foto de perfil es obligatoria para publicar staff en booking y proteger a clientes/proveedor.", "Add staff. A profile photo is required to publish staff in booking and protect clients/providers.")}</p>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={tx("Nombre del profesional", "Professional name")} value={form.display_name} onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))} required />
            <Input placeholder={tx("Bio corta (opcional)", "Short bio (optional)")} value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? tx("Guardando...", "Saving...") : form.id ? tx("Actualizar", "Update") : tx("Agregar staff", "Add staff")}</Button>
            {form.id ? <Button type="button" variant="secondary" onClick={() => setForm({ id: "", display_name: "", bio: "" })}>{tx("Cancelar", "Cancel")}</Button> : null}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-2xl">{tx("Equipo", "Team")}</h2>
        {loading ? <p className="mt-3 text-coolSilver">{tx("Cargando...", "Loading...")}</p> : null}
        <div className="mt-3 space-y-3">
          {staff.filter((member) => member.is_active !== false).map((member) => (
            <div key={member.id} className="rounded-2xl border border-silver/20 bg-black/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <Image src={member.avatar_url} alt={member.display_name} width={46} height={46} className="h-[46px] w-[46px] rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-gold/20 text-sm font-semibold text-softGold">
                      {member.display_name
                        .split(" ")
                        .map((item) => item[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-textWhite">{member.display_name}</p>
                    <p className="text-xs text-mutedText">{member.bio || tx("Sin bio", "No bio")}</p>
                    {!member.avatar_url ? <p className="text-xs text-rose-300">{tx("Foto requerida antes de publicar", "Photo required before publishing")}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setForm({ id: member.id, display_name: member.display_name, bio: member.bio || "" })}>{tx("Editar", "Edit")}</Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(member.id)}>{tx("Quitar", "Remove")}</Button>
                </div>
              </div>
              <div className="mt-3">
                <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-silver/20 bg-richBlack/80 px-4 py-3 text-sm text-coolSilver hover:border-softGold">
                  <span>{tx("Subir foto del staff", "Upload staff photo")}</span>
                  <span className="rounded-xl border border-gold/30 px-3 py-1 text-xs text-softGold">{tx("Elegir archivo", "Choose file")}</span>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      onUploadAvatar(member.id, file);
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
          {staff.filter((member) => member.is_active !== false).length === 0 ? (
            <p className="text-sm text-coolSilver">{tx("Aún no hay staff creado.", "No staff created yet.")}</p>
          ) : null}
        </div>
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
