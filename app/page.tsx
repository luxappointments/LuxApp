import { LandingHero } from "@/components/landing/hero";
import { BusinessCard } from "@/components/landing/business-card";
import { getServerT } from "@/lib/i18n/server";
import { searchBusinesses } from "@/lib/queries";

interface HomeProps {
  searchParams: Promise<{ city?: string; category?: string; query?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const businesses = await searchBusinesses(params);
  const { t } = await getServerT();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-12">
      <LandingHero />

      <section className="space-y-4">
        <h2 className="font-display text-3xl text-textWhite">{t("home.featured")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      </section>
    </main>
  );
}
