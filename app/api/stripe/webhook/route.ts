import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/billing/stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature", details: String(err) }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const kind = session.metadata?.kind;

      if (kind === "appointment_deposit" && session.payment_status === "paid") {
        const appointmentId = session.metadata?.appointmentId;
        if (appointmentId) {
          await supabase
            .from("appointments")
            .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: session.payment_intent })
            .eq("id", appointmentId);
        }
      }

      if (kind === "membership") {
        const businessId = session.metadata?.businessId;
        if (businessId) {
          await supabase
            .from("business_subscriptions")
            .upsert({
              business_id: businessId,
              stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
              stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
              status: "active"
            }, { onConflict: "business_id" });
        }
      }

      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await supabase
        .from("business_subscriptions")
        .update({
          status: sub.status,
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString()
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
