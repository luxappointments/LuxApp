import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { getServerT } from "@/lib/i18n/server";

export default async function SignInPage() {
  const { t } = await getServerT();

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="font-display text-3xl">{t("auth.signinTitle")}</h1>
        <AuthForm mode="signin" />
      </Card>
    </main>
  );
}
