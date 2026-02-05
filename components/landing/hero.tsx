"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

export function LandingHero() {
  const { t, tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (mounted) setIsLoggedIn(Boolean(data.user));
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsLoggedIn(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-black/60 p-6 md:p-10">
      <div className="absolute inset-0 bg-glow" />
      <div className="relative z-10 space-y-6">
        <p className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-softGold">
          {tx("Citas premium sin comisiones abusivas", "Premium bookings without abusive commissions")}
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-tight text-textWhite md:text-6xl">
          {t("home.title")}
        </h1>
        <p className="max-w-2xl text-mutedText">
          {t("home.subtitle")}
        </p>

        {!isLoggedIn ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/signup">{t("home.ctaSignup")}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/auth/signin">{t("home.ctaLogin")}</Link>
            </Button>
          </div>
        ) : null}

        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" action="/" method="GET">
          <Input placeholder={tx("Ciudad", "City")} name="city" />
          <Input placeholder={tx("Categoría (nails, barber...)", "Category (nails, barber...)")} name="category" />
          <Input placeholder={tx("Nombre del negocio", "Business name")} name="query" />
          <Button className="h-11" type="submit">
            {tx("Buscar", "Search")}
          </Button>
        </form>
      </div>
    </section>
  );
}
