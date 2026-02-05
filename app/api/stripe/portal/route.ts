import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/billing/stripe";

const schema = z.object({
  customerId: z.string().min(1)
});

export async function POST(req: Request) {
  const payload = await req.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  const session = await stripe.billingPortal.sessions.create({
    customer: parsed.data.customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`
  });

  return NextResponse.json({ url: session.url });
}
