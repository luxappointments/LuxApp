"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientSupabase } from "@/lib/supabase/client";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  created_at: string;
};

export function ReviewSection({ businessId, initialReviews }: { businessId: string; initialReviews?: ReviewItem[] }) {
  const { tx } = useLocale();
  const supabase = useMemo(() => getClientSupabase(), []);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews || []);
  const [eligible, setEligible] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadReviews() {
      const res = await fetch(`/api/reviews?businessId=${businessId}`);
      const payload = await res.json();
      if (res.ok && mounted) setReviews(payload.reviews || []);
    }

    async function checkEligibility() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/reviews/eligibility?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await res.json();
      if (mounted) {
        setEligible(Boolean(payload.eligible));
        setAppointmentId(payload.appointmentId || null);
      }
    }

    loadReviews();
    checkEligibility();

    return () => {
      mounted = false;
    };
  }, [businessId, supabase]);

  async function submitReview() {
    setSaving(true);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !appointmentId) {
      setMessage(tx("Debes iniciar sesión y tener una cita completada.", "You must be signed in and have a completed appointment."));
      setSaving(false);
      return;
    }

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        businessId,
        appointmentId,
        rating,
        comment: comment || null
      })
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || tx("No se pudo enviar el review.", "Could not submit review."));
      setSaving(false);
      return;
    }

    setReviews((prev) => [payload.review, ...prev]);
    setEligible(false);
    setComment("");
    setSaving(false);
    setMessage(tx("Gracias por tu review.", "Thanks for your review."));
  }

  return (
    <Card>
      <h2 className="font-display text-2xl">{tx("Reviews", "Reviews")}</h2>
      <p className="mt-1 text-sm text-mutedText">
        {tx("Solo clientes atendidos pueden dejar review. El negocio puede responder y publicar para crecer, no para penalizar.", "Only serviced clients can leave reviews. Businesses can reply and publish to grow, not to penalize.")}
      </p>

      {eligible ? (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${rating === value ? "border-softGold bg-gold/10 text-softGold" : "border-silver/20 text-coolSilver"}`}
                onClick={() => setRating(value)}
              >
                {value} ★
              </button>
            ))}
          </div>
          <Input
            placeholder={tx("Cuéntanos tu experiencia (opcional)", "Tell us about your experience (optional)")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={submitReview} disabled={saving}>
            {saving ? "..." : tx("Enviar review", "Submit review")}
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-coolSilver">{message}</p> : null}

      <div className="mt-4 space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-coolSilver">{tx("No hay reviews disponibles.", "No reviews available.")}</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-silver/20 bg-black/40 p-3 text-sm">
              <p className="text-softGold">{review.rating} ★</p>
              {review.comment ? <p className="mt-1 text-textWhite">{review.comment}</p> : null}
              {review.reply ? (
                <div className="mt-2 rounded-xl border border-gold/20 bg-gold/10 p-2 text-xs text-coolSilver">
                  <p className="text-softGold">{tx("Respuesta del negocio", "Business reply")}</p>
                  <p>{review.reply}</p>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
