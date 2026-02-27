import { getServerT } from "@/lib/i18n/server";
import { getBusinessBySlug } from "@/lib/queries";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { SINGLE_BUSINESS_SLUG, SINGLE_BUSINESS_NAME } from "@/lib/single-business";

export default async function Home() {
  const { business } = await getBusinessBySlug(SINGLE_BUSINESS_SLUG);
  const { t } = await getServerT();
  const admin = getAdminSupabase();
  const { data: specials } = business
    ? await admin
        .from("business_specials")
        .select("id, title, description, discount_percent, business_id")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as any[] };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-black/60 p-6 md:p-10">
        <div className="absolute inset-0 bg-glow" />
        <div className="relative z-10 space-y-4">
          <p className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-softGold">
            {t("home.special")}
          </p>
          <h1 className="max-w-3xl font-display text-4xl leading-tight text-textWhite md:text-6xl">
            {SINGLE_BUSINESS_NAME}
          </h1>
          <p className="max-w-2xl text-mutedText">
            {business?.description || "Luxury booking experience for nails, beauty and premium care."}
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="gold-gradient inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-black" href={`/b/${SINGLE_BUSINESS_SLUG}/book`}>
              Reservar cita
            </a>
            <a className="inline-flex h-11 items-center justify-center rounded-2xl border border-silver/30 px-5 text-sm font-semibold text-textWhite hover:border-softGold" href={`/b/${SINGLE_BUSINESS_SLUG}`}>
              Ver negocio
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl text-textWhite">{SINGLE_BUSINESS_NAME}</h2>
        <div className="lux-card p-5">
          <p className="text-coolSilver">{business?.city} · {business?.category}</p>
          <p className="mt-2 text-mutedText">{business?.description || "Premium services and appointments."}</p>
          <a className="mt-4 inline-flex rounded-xl border border-gold/30 px-3 py-2 text-xs text-softGold hover:bg-gold/10" href={`/b/${SINGLE_BUSINESS_SLUG}/book`}>
            {t("home.viewBusiness")}
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl text-softGold">{t("home.deals")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(specials || []).map((deal: any) => (
            <div key={deal.id} className="lux-card p-4">
              <p className="text-softGold">{deal.title}</p>
              {deal.description ? <p className="mt-1 text-sm text-coolSilver">{deal.description}</p> : null}
              <p className="mt-2 text-xs text-mutedText">
                {SINGLE_BUSINESS_NAME} · {deal.discount_percent ? `${deal.discount_percent}% OFF` : t("home.special")}
              </p>
              <a
                className="mt-3 inline-flex rounded-xl border border-gold/30 px-3 py-2 text-xs text-softGold hover:bg-gold/10"
                href={`/b/${SINGLE_BUSINESS_SLUG}`}
              >
                {t("home.viewBusiness")}
              </a>
            </div>
          ))}
          {(specials || []).length === 0 ? (
            <p className="text-sm text-coolSilver">{t("home.noDeals")}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
