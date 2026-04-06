import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
      const client = await clerkClient();
      const userData = await client.users.getUser(userId);
      const email = userData.emailAddresses[0]?.emailAddress || "";

      // Check if user exists with this email but different clerkId (e.g. switched from dev to prod keys)
      const existingByEmail = await db.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await db.user.update({
          where: { email },
          data: { clerkId: userId },
        });
      } else {
        user = await db.user.create({
          data: { clerkId: userId, email },
        });
      }
    }

    if (user.subscribed) {
      return NextResponse.json({ error: "Already subscribed" }, { status: 400 });
    }

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
      subscription_data: {
        trial_period_days: 30,
        metadata: { promo: "30-day-free-trial" },
      },
      success_url: `${req.headers.get("origin")}/dashboard?success=true&trial=true`,
      cancel_url: `${req.headers.get("origin")}/promo?canceled=true`,
      metadata: { userId: user.id, clerkId: userId, promo: "30-day-free-trial" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Promo checkout error:", error);
    return NextResponse.json({ error: `Failed to create promo checkout: ${message}` }, { status: 500 });
  }
}
