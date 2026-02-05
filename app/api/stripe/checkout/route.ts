import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripePriceId } from "@/lib/billing/plans";
import { stripe } from "@/lib/billing/stripe";

const schema = z.object({
  mode: z.enum(["subscription", "deposit"]),
  plan: z.enum(["silver", "gold", "black"]).optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
  amountCents: z.number().int().positive().optional(),
  businessId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  customerEmail: z.string().email()
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (input.mode === "subscription") {
    if (!input.plan || !input.interval) {
      return NextResponse.json({ error: "Faltan plan/interval" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.customerEmail,
      line_items: [
        {
          price: getStripePriceId(input.plan, input.interval),
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/overview?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
      metadata: {
        kind: "membership",
        businessId: input.businessId || ""
      }
    });

    return NextResponse.json({ url: session.url });
  }

  if (!input.amountCents || !input.appointmentId) {
    return NextResponse.json({ error: "Faltan amountCents/appointmentId" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Depósito de cita LuxApp" },
          unit_amount: input.amountCents
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/appointments?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/appointments?canceled=1`,
    metadata: {
      kind: "appointment_deposit",
      appointmentId: input.appointmentId,
      businessId: input.businessId || ""
    }
  });

  return NextResponse.json({ url: session.url });
}
