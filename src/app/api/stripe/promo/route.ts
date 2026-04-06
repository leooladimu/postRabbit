import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { resolveUser } from "@/lib/resolve-user";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const ALLOWED_TRIAL_DAYS = [7, 14, 30];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveUser(userId, { createIfMissing: true });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Already subscribed — just send them to the dashboard
    if (user.subscribed) {
      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://postrabbit.oleo.dev";
      return NextResponse.json({ url: `${origin}/dashboard` });
    }

    const { days } = await req.json();
    const trialDays = ALLOWED_TRIAL_DAYS.includes(days) ? days : 30;

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://postrabbit.oleo.dev";

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: !user.stripeCustomerId ? user.email : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: trialDays,
      },
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/promo/${trialDays}`,
      metadata: { userId: user.id, clerkId: userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Promo checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create promo checkout" },
      { status: 500 }
    );
  }
}
