"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { BusinessCard as BusinessCardType } from "@/types/domain";

export function BusinessCard({ business }: { business: BusinessCardType }) {
  const { tx } = useLocale();

  return (
    <Card className="overflow-hidden p-0">
      <Link href={`/b/${business.slug}`} className="relative h-44 w-full block">
        {business.coverUrl ? (
          <img src={business.coverUrl} alt={`${business.name} cover`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gold/20 to-silver/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-4 flex items-center gap-3">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={`${business.name} logo`} className="h-12 w-12 rounded-2xl border border-gold/40 object-cover bg-black/40" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/40 bg-black/50 text-sm font-semibold text-softGold">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-softGold">{tx("Premium", "Premium")}</p>
            <p className="text-lg text-textWhite">{business.name}</p>
          </div>
        </div>
      </Link>
      <div className="p-5">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle>{business.name}</CardTitle>
            {business.rating ? <Badge>{business.rating.toFixed(1)} ★</Badge> : null}
          </div>
          <CardDescription>
            {business.city} · {business.category}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge className="bg-emerald-500/10 text-emerald-300">{tx("Disponible hoy", "Available today")}</Badge>
          <Button asChild className="w-full">
            <Link href={`/b/${business.slug}/book`}>{tx("Reservar", "Book")}</Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}
