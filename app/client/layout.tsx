"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { tx } = useLocale();
  const links = [
    [tx("Mis citas", "My appointments"), "/client/appointments"],
    [tx("Historial", "History"), "/client/history"],
    [tx("Favoritos", "Favorites"), "/client/favorites"]
  ] as const;

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-[180px_1fr]">
      <aside className="lux-card h-fit p-3">
        <p className="px-2 pb-2 font-display text-xl text-softGold">{tx("Cliente", "Client")}</p>
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm text-coolSilver hover:bg-gold/10 hover:text-softGold">
            {label}
          </Link>
        ))}
      </aside>
      <section>{children}</section>
    </main>
  );
}
