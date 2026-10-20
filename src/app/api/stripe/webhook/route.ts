import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { hasSubscriptionAccess } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (session.mode === "subscription" && userId && customerId) {
        const subscribed = await hasSubscriptionAccess(customerId);
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId, subscribed },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      const subscribed = await hasSubscriptionAccess(customerId);
      await db.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscribed },
      });
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      // Subscription invoices use parent.subscription_details in this API version.
      if (customerId && invoice.parent?.subscription_details) {
        const subscribed = await hasSubscriptionAccess(customerId);
        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscribed },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
