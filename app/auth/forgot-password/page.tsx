"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getClientSupabase(), []);
  const { tx } = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(tx("Te enviamos un email para restablecer tu contraseña.", "We sent you an email to reset your password."));
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="font-display text-3xl">{tx("Recuperar contraseña", "Recover password")}</h1>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button className="w-full" disabled={loading}>
            {loading ? tx("Enviando...", "Sending...") : tx("Enviar link", "Send link")}
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
        <p className="mt-3 text-sm text-mutedText">
          <Link className="text-softGold hover:underline" href="/auth/signin">
            {tx("Volver a iniciar sesión", "Back to sign in")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
