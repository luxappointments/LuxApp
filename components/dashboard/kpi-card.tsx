import { Card } from "@/components/ui/card";

export function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-mutedText">{title}</p>
      <p className="font-display text-3xl text-softGold">{value}</p>
      <p className="text-sm text-coolSilver">{subtitle}</p>
    </Card>
  );
}
