"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { PLAN_CONFIG, PLAN_ORDER } from "@/lib/billing/plans";
import { getClientSupabase } from "@/lib/supabase/client";

type AccessState = "loading" | "allowed" | "denied";

export default function PricingPage() {
  const { locale, tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [access, setAccess] = useState<AccessState>("loading");
  const planCopy: Record<string, { description: { es: string; en: string }; features: { es: string[]; en: string[] } }> = {
    free: {
      description: { es: "Para arrancar y validar tu negocio.", en: "Start and validate your business." },
      features: {
        es: ["1 negocio", "1 staff", "Hasta 40 citas al mes", "Pagos externos con comprobante", "Emails básicos"],
        en: ["1 business", "1 staff", "Up to 40 appointments per month", "External payments with proof", "Basic emails"]
      }
    },
    silver: {
      description: { es: "Crece con más staff y depósitos básicos.", en: "Grow with more staff and basic deposits." },
      features: {
        es: ["1 negocio", "Hasta 3 staff", "Citas ilimitadas", "Stripe depósitos fijo o %", "Horarios avanzados + breaks", "Emails premium"],
        en: ["1 business", "Up to 3 staff", "Unlimited appointments", "Stripe fixed or % deposits", "Advanced schedules + breaks", "Premium emails"]
      }
    },
    gold: {
      description: { es: "Plan pro con automatización inteligente.", en: "Pro plan with smart automation." },
      features: {
        es: ["Hasta 2 negocios", "Hasta 10 staff", "Citas ilimitadas", "Slots inteligentes", "No-show protection por negocio", "Políticas avanzadas", "Analytics básicos"],
        en: ["Up to 2 businesses", "Up to 10 staff", "Unlimited appointments", "Smart slots", "No-show protection per business", "Advanced policies", "Basic analytics"]
      }
    },
    black: {
      description: { es: "Escala sin límites con protección global.", en: "Scale without limits with global protection." },
      features: {
        es: ["Negocios ilimitados", "Staff ilimitado", "Depósito dinámico global 0/30/100", "Soft blacklist global", "SMS reminders (si activas proveedor)", "Branding completo", "Prioridad en búsqueda", "Analytics pro"],
        en: ["Unlimited businesses", "Unlimited staff", "Global dynamic deposit 0/30/100", "Global soft blacklist", "SMS reminders (if provider enabled)", "Full branding", "Search priority", "Pro analytics"]
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    async function validateAccess() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (mounted) setAccess("denied");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();

      const isBusinessRole = profile?.role === "owner" || profile?.role === "staff" || profile?.role === "admin";
      const isBusinessMetadata = auth.user.user_metadata?.account_type === "business";

      if (mounted) {
        setAccess(isBusinessRole || isBusinessMetadata ? "allowed" : "denied");
      }
    }

    validateAccess();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (access === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card>
          <p className="text-coolSilver">{tx("Cargando planes...", "Loading plans...")}</p>
        </Card>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="space-y-4">
          <h1 className="font-display text-4xl">{tx("Planes para negocios", "Business plans")}</h1>
          <p className="text-coolSilver">{tx("Esta pantalla es exclusiva para cuentas de negocio. Si eres cliente, usa el panel de citas.", "This screen is only for business accounts. If you are a client, use the appointments panel.")}</p>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/client/appointments">{tx("Ir a mi panel cliente", "Go to my client panel")}</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">{tx("Crear cuenta negocio", "Create business account")}</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="font-display text-5xl">{tx("Membresías LuxApp", "LuxApp memberships")}</h1>
      <p className="max-w-2xl text-coolSilver">{tx("Anual siempre equivale a 2 meses gratis: pagas 10 meses.", "Annual always equals 2 months free: you pay 10 months.")}</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const item = PLAN_CONFIG[plan];
          const copy = planCopy[plan];
          const description = copy ? copy.description[locale] : item.description;
          const features = copy ? copy.features[locale] : item.features;
          return (
            <Card key={plan} className="space-y-4">
              <p className="font-display text-2xl text-softGold">{item.name}</p>
              <p className="text-sm text-coolSilver">{description}</p>
              <div>
                <p className="text-3xl text-textWhite">${item.monthly}/{tx("mes", "mo")}</p>
                <p className="text-sm text-mutedText">${item.annual}/{tx("año", "yr")}</p>
              </div>
              <div className="space-y-2">
                {features.map((feature) => (
                  <p key={feature} className="text-sm text-coolSilver">
                    • {feature}
                  </p>
                ))}
              </div>
              <Button className="w-full">{tx("Elegir", "Choose")} {item.name}</Button>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
