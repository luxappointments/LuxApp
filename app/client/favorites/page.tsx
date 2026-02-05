import { Card } from "@/components/ui/card";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ClientFavoritesPage() {
  const locale = await getServerLocale();
  const tx = (es: string, en: string) => (locale === "en" ? en : es);

  return (
    <Card>
      <h1 className="font-display text-3xl">{tx("Favoritos", "Favorites")}</h1>
      <p className="mt-4 text-coolSilver">{tx("Guarda y re-reserva tus negocios favoritos en un toque.", "Save and rebook your favorite businesses in one tap.")}</p>
    </Card>
  );
}
