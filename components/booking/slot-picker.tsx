"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlotOption } from "@/types/domain";

const weekShort = {
  es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const,
  en: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
};
const monthShort = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const,
  en: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const
};

function getIsoDayKey(iso: string) {
  return iso.slice(0, 10);
}

function formatDayLabelFromIsoDay(dayKey: string, locale: "es" | "en") {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return `${weekShort[locale][date.getUTCDay()]}, ${monthShort[locale][date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function formatTimeLabelUtc(iso: string, locale: "es" | "en") {
  const date = new Date(iso);
  const hh24 = date.getUTCHours();
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const isPm = hh24 >= 12;
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  if (locale === "en") return `${String(hh12).padStart(2, "0")}:${mm} ${isPm ? "PM" : "AM"}`;
  return `${String(hh12).padStart(2, "0")}:${mm} ${isPm ? "p.m." : "a.m."}`;
}

export function SlotPicker({
  slots,
  selectedSlotKey,
  onSelectSlot
}: {
  slots: SlotOption[];
  selectedSlotKey?: string | null;
  onSelectSlot?: (slot: SlotOption) => void;
}) {
  const { locale, t } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const dates = useMemo(() => {
    const unique = Array.from(new Set(slots.map((slot) => getIsoDayKey(slot.startsAt))));
    return unique.map((key) => ({ key, label: formatDayLabelFromIsoDay(key, locale) }));
  }, [slots, locale]);

  const [activeDate, setActiveDate] = useState<string | null>(dates[0]?.key ?? null);

  const filteredByDate = useMemo(() => {
    if (!activeDate) return slots;
    return slots.filter((slot) => getIsoDayKey(slot.startsAt) === activeDate);
  }, [slots, activeDate]);

  const recommended = useMemo(() => filteredByDate.filter((slot) => slot.recommended).slice(0, 8), [filteredByDate]);
  const visible = showAll ? filteredByDate : recommended;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => (
          <Button
            key={date.key}
            type="button"
            size="sm"
            variant={activeDate === date.key ? "default" : "secondary"}
            className="shrink-0"
            onClick={() => setActiveDate(date.key)}
          >
            {date.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-softGold">{t("booking.recommendedSlots")}</p>
        <button className="text-xs text-coolSilver hover:text-softGold" onClick={() => setShowAll((v) => !v)} type="button">
          {showAll ? t("booking.viewRecommended") : t("booking.viewAll")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {visible.map((slot) => {
          const key = `${slot.staffId}-${slot.startsAt}`;
          const label = formatTimeLabelUtc(slot.startsAt, locale);
          const active = (selectedSlotKey ?? selected) === key;
          return (
            <Button
              key={key}
              type="button"
              variant={active ? "default" : "secondary"}
              className={cn("h-11 rounded-xl", active && "ring-2 ring-gold")}
              onClick={() => {
                setSelected(key);
                onSelectSlot?.(slot);
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
