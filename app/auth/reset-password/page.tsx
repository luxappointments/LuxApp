"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getClientSupabase(), []);
  const { tx } = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage(tx("Las contraseñas no coinciden.", "Passwords do not match."));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(tx("Contraseña actualizada. Ya puedes iniciar sesión.", "Password updated. You can sign in now."));
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="font-display text-3xl">{tx("Nueva contraseña", "New password")}</h1>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <Input
            placeholder={tx("Nueva contraseña", "New password")}
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            placeholder={tx("Confirmar contraseña", "Confirm password")}
            type="password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button className="w-full" disabled={loading}>
            {loading ? tx("Guardando...", "Saving...") : tx("Actualizar contraseña", "Update password")}
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
        <p className="mt-3 text-sm text-mutedText">
          <Link className="text-softGold hover:underline" href="/auth/signin">
            {tx("Ir a iniciar sesión", "Go to sign in")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
