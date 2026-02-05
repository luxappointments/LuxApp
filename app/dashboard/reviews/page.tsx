"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  is_published: boolean;
  created_at: string;
  appointment_id: string;
};

export default function ReviewsPage() {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [replyById, setReplyById] = useState<Record<string, string>>({});

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    return headers;
  }

  async function loadReviews() {
    const res = await fetch("/api/dashboard/reviews", { headers: await authHeaders() });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudieron cargar reviews.", "Could not load reviews."));
    } else {
      setReviews(payload.reviews || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function updateReview(id: string, body: { reply?: string | null; is_published?: boolean }) {
    const res = await fetch("/api/dashboard/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ id, ...body })
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo actualizar el review.", "Could not update review."));
      return;
    }
    setMessage(tx("Review actualizado.", "Review updated."));
    await loadReviews();
  }

  return (
    <>
      <h1 className="font-display text-4xl">{tx("Reviews", "Reviews")}</h1>
      <Card>
        <p className="mb-3 text-sm text-coolSilver">
          {tx("Controla los reviews, publica los que quieras mostrar y responde para crecer.", "Control reviews, publish what you want to show, and reply to grow.")}
        </p>

        {loading ? <p className="text-coolSilver">{tx("Cargando reviews...", "Loading reviews...")}</p> : null}

        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-silver/20 bg-black/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-softGold">{review.rating} ★</p>
                <Button
                  size="sm"
                  variant={review.is_published ? "secondary" : "danger"}
                  onClick={() => updateReview(review.id, { is_published: !review.is_published })}
                >
                  {review.is_published ? tx("Ocultar", "Hide") : tx("Publicar", "Publish")}
                </Button>
              </div>
              {review.comment ? <p className="mt-2 text-textWhite">{review.comment}</p> : null}
              <div className="mt-3">
                <Input
                  placeholder={tx("Respuesta del negocio", "Business reply")}
                  value={replyById[review.id] ?? review.reply ?? ""}
                  onChange={(e) => setReplyById((prev) => ({ ...prev, [review.id]: e.target.value }))}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => updateReview(review.id, { reply: replyById[review.id] ?? review.reply ?? "" })}
                >
                  {tx("Guardar respuesta", "Save reply")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}
      </Card>
    </>
  );
}
