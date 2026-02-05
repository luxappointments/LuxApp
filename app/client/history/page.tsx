import { Card } from "@/components/ui/card";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ClientHistoryPage() {
  const locale = await getServerLocale();
  const tx = (es: string, en: string) => (locale === "en" ? en : es);

  return (
    <Card>
      <h1 className="font-display text-3xl">{tx("Historial", "History")}</h1>
      <p className="mt-4 text-coolSilver">{tx("Tus citas completadas y pagos previos.", "Your completed appointments and previous payments.")}</p>
    </Card>
  );
}
