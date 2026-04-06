import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or get price
    let priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      const product = await stripe.products.create({
        name: "postRabbit Monthly Subscription",
        description: "SEO content generation for your business",
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 4000,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
    }

    // Clear stale test-mode Stripe customer ID if present
    if (user.stripeCustomerId) {
      try {
        await stripe.customers.retrieve(user.stripeCustomerId);
      } catch {
        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: null },
        });
        user = { ...user, stripeCustomerId: null };
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: !user.stripeCustomerId ? user.email : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard?canceled=true`,
      metadata: { userId: user.id, clerkId: userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
