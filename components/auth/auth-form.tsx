"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type AccountType = "client" | "business";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/\\s+/g, "-")
    .replace(/-+/g, "-");
}

export function AuthForm({ mode }: { mode: Mode }) {
  const supabase = useMemo(() => getClientSupabase(), []);
  const { t, tx } = useLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [businessName, setBusinessName] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignup) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              account_type: accountType,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              phone,
              business_name: accountType === "business" ? businessName : undefined,
              business_city: accountType === "business" ? businessCity : undefined,
              business_category: accountType === "business" ? businessCategory : undefined,
              business_slug: accountType === "business" ? (businessSlug || slugify(businessName)) : undefined
            },
            emailRedirectTo: `${window.location.origin}/auth/signin`
          }
        });

        if (error) {
          setMessage(error.message);
        } else if (data.session && accountType === "business") {
          const res = await fetch("/api/auth/onboard-business", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              firstName,
              lastName,
              phone,
              businessName,
              businessCity,
              businessCategory,
              businessSlug: businessSlug || slugify(businessName)
            })
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            setMessage(payload.error || tx("Cuenta creada, pero falló el onboarding de negocio.", "Account created, but business onboarding failed."));
          } else {
            window.location.href = "/dashboard/overview";
          }
        } else if (!data.session) {
          setMessage(tx("Cuenta creada. Revisa tu email para confirmar y luego inicia sesión.", "Account created. Check your email to confirm, then sign in."));
        } else if (accountType === "client") {
          const res = await fetch("/api/auth/onboard-client", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              firstName,
              lastName,
              phone
            })
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            setMessage(payload.error || tx("Cuenta creada, pero falló el onboarding del perfil.", "Account created, but profile onboarding failed."));
          } else {
            window.location.href = "/client/appointments";
          }
        } else {
          window.location.href = "/client/appointments";
        }
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setMessage(error.message);
        } else {
          let target = "/client/appointments";

          const profileRole = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

          const role = profileRole.data?.role;
          if (role === "owner" || role === "staff" || role === "admin") {
            target = "/dashboard/overview";
          } else if ((data.user?.user_metadata?.account_type as AccountType | undefined) === "business") {
            target = "/dashboard/overview";
          }

          window.location.href = target;
        }
      }
    } catch {
      setMessage(tx("No se pudo conectar con Supabase. Verifica internet, URL y API key.", "Could not connect to Supabase. Check your internet, URL, and API key."));
    }

    setLoading(false);
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
      {isSignup ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`rounded-2xl border px-4 py-3 text-sm ${accountType === "client" ? "border-gold bg-gold/10 text-softGold" : "border-silver/20 bg-richBlack/70 text-coolSilver"}`}
              onClick={() => setAccountType("client")}
              type="button"
            >
              {t("auth.clientAccount")}
            </button>
            <button
              className={`rounded-2xl border px-4 py-3 text-sm ${accountType === "business" ? "border-gold bg-gold/10 text-softGold" : "border-silver/20 bg-richBlack/70 text-coolSilver"}`}
              onClick={() => setAccountType("business")}
              type="button"
            >
              {t("auth.businessAccount")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={tx("Nombre", "First name")}
              aria-label={t("auth.firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              placeholder={tx("Apellido", "Last name")}
              aria-label={t("auth.lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          {accountType === "business" ? (
            <>
              <Input
                placeholder={tx("Nombre del negocio", "Business name")}
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  setBusinessSlug(slugify(e.target.value));
                }}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder={tx("Ciudad", "City")}
                  value={businessCity}
                  onChange={(e) => setBusinessCity(e.target.value)}
                  required
                />
                <Input
                  placeholder={tx("Categoría", "Category")}
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  required
                />
              </div>
              <Input
                placeholder={tx("Slug (ej: luxe-nails-miami)", "Slug (e.g. luxe-nails-miami)")}
                value={businessSlug}
                onChange={(e) => setBusinessSlug(slugify(e.target.value))}
                required
              />
            </>
          ) : null}
          <Input
            placeholder={tx("Teléfono", "Phone")}
            aria-label={t("auth.phone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </>
      ) : null}
      <Input
        placeholder={tx("Email", "Email")}
        type="email"
        aria-label={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        placeholder={tx("Contraseña", "Password")}
        type="password"
        aria-label={t("auth.password")}
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button className="w-full" disabled={loading}>
        {loading ? "..." : isSignup ? t("nav.signup") : t("nav.login")}
      </Button>

      {message ? <p className="text-sm text-coolSilver">{message}</p> : null}

      <p className="text-sm text-mutedText">
        {isSignup ? tx("¿Ya tienes cuenta?", "Already have an account?") : tx("¿No tienes cuenta?", "No account yet?")}{" "}
        <Link className="text-softGold hover:underline" href={isSignup ? "/auth/signin" : "/auth/signup"}>
          {isSignup ? tx("Inicia sesión", "Sign in") : tx("Crear cuenta", "Create account")}
        </Link>
      </p>
      {!isSignup ? (
        <p className="text-sm text-mutedText">
          {t("auth.forgot")}{" "}
          <Link className="text-softGold hover:underline" href="/auth/forgot-password">
            {t("auth.reset")}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
