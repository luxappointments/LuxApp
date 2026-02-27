import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/layout/global-header";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { getServerLocale } from "@/lib/i18n/server";
import Script from "next/script";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair"
});

export const metadata: Metadata = {
  title: "Diamond Studio by Nicole | Citas Premium",
  description: "Reserva citas premium para Diamond Studio by Nicole.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0B0B0F",
  icons: {
    icon: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }]
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${playfair.variable} antialiased`}>
        <Script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" strategy="afterInteractive" />
        <LocaleProvider initialLocale={locale}>
          <OneSignalProvider />
          <GlobalHeader />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
