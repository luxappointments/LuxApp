"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

export function QuickActions() {
  const { tx } = useLocale();
  const actions = [
    tx("Confirmar", "Confirm"),
    tx("Cancelar", "Cancel"),
    tx("Marcar No-Show", "Mark No-Show"),
    tx("Completar", "Complete")
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {actions.map((label) => (
        <Button key={label} variant="secondary" className="w-full">
          {label}
        </Button>
      ))}
    </div>
  );
}
