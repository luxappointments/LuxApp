import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/layout/global-header";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getServerLocale } from "@/lib/i18n/server";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair"
});

export const metadata: Metadata = {
  title: "LuxApp | Citas Premium para Servicios",
  description: "Plataforma SaaS multi-tenant de reservas premium para negocios de servicios locales"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${playfair.variable} antialiased`}>
        <LocaleProvider initialLocale={locale}>
          <GlobalHeader />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
