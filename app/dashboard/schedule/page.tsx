"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { getClientSupabase } from "@/lib/supabase/client";

type DaySchedule = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  slot_granularity_min: number;
};

const dayNames = {
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};

const defaults: DaySchedule[] = Array.from({ length: 7 }).map((_, weekday) => ({
  weekday,
  start_time: "09:00",
  end_time: "18:00",
  is_closed: weekday === 0,
  slot_granularity_min: 15
}));

export default function SchedulePage() {
  const { locale, tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [days, setDays] = useState<DaySchedule[]>(defaults);
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
      const res = await fetch("/api/dashboard/schedule", { headers: await authHeaders() });
      const payload = await res.json();

      if (res.ok && payload.schedule) {
        const merged = defaults.map((base) => payload.schedule.find((item: DaySchedule) => item.weekday === base.weekday) || base);
        setDays(merged);
      } else if (!res.ok) {
        setMessage(payload.error || tx("No se pudo cargar horario.", "Could not load schedule."));
      }

      setLoading(false);
    }

    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/dashboard/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify({ days })
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo guardar horario.", "Could not save schedule."));
      setSaving(false);
      return;
    }

    setMessage(tx("Horario actualizado.", "Schedule updated."));
    setSaving(false);
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Horarios y breaks", "Schedule and breaks")}</h1>
      <Card>
        {loading ? (
          <p className="text-coolSilver">{tx("Cargando horario...", "Loading schedule...")}</p>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            {days.map((day, index) => (
              <div key={day.weekday} className="rounded-xl border border-silver/20 bg-black/40 p-3">
                <p className="mb-2 text-textWhite">{dayNames[locale][day.weekday]}</p>
                <div className="grid gap-2 md:grid-cols-5">
                  <label className="text-xs text-coolSilver">
                    {tx("Inicio", "Start")}
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-silver/20 bg-richBlack/80 px-2 text-textWhite"
                      type="time"
                      value={day.start_time}
                      onChange={(e) => setDays((prev) => prev.map((item, i) => (i === index ? { ...item, start_time: e.target.value } : item)))}
                      disabled={day.is_closed}
                    />
                  </label>
                  <label className="text-xs text-coolSilver">
                    {tx("Fin", "End")}
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-silver/20 bg-richBlack/80 px-2 text-textWhite"
                      type="time"
                      value={day.end_time}
                      onChange={(e) => setDays((prev) => prev.map((item, i) => (i === index ? { ...item, end_time: e.target.value } : item)))}
                      disabled={day.is_closed}
                    />
                  </label>
                  <label className="text-xs text-coolSilver">
                    {tx("Granularidad", "Granularity")}
                    <select
                      className="mt-1 h-10 w-full rounded-xl border border-silver/20 bg-richBlack/80 px-2 text-textWhite"
                      value={day.slot_granularity_min}
                      onChange={(e) => setDays((prev) => prev.map((item, i) => (i === index ? { ...item, slot_granularity_min: Number(e.target.value) } : item)))}
                    >
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                    </select>
                  </label>
                  <label className="col-span-2 flex items-end gap-2 text-xs text-coolSilver">
                    <input
                      type="checkbox"
                      checked={day.is_closed}
                      onChange={(e) => setDays((prev) => prev.map((item, i) => (i === index ? { ...item, is_closed: e.target.checked } : item)))}
                    />
                    {tx("Día cerrado", "Closed day")}
                  </label>
                </div>
              </div>
            ))}

            <Button type="submit" disabled={saving}>{saving ? tx("Guardando...", "Saving...") : tx("Guardar horario", "Save schedule")}</Button>
          </form>
        )}
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
