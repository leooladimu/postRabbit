import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { resolveUser } from "@/lib/resolve-user";
import { hasSubscriptionAccess } from "@/lib/subscription";
import { isAllowedTrialDays } from "@/lib/trial-days";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://postrabbit.oleo.dev";

    // Validate before resolveUser so a junk request can't create a DB row. Any bad body
    // or unlisted days value goes to the dashboard: never fall back to a default free trial.
    const body = await req.json().catch(() => null);
    const days =
      body && typeof body === "object" && !Array.isArray(body) ? (body as { days?: unknown }).days : undefined;
    if (!isAllowedTrialDays(days)) {
      return NextResponse.json({ url: `${origin}/dashboard` });
    }

    const user = await resolveUser(userId, { createIfMissing: true });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Already subscribed — just send them to the dashboard.
    // Ask Stripe, not the cached user.subscribed flag: a stale flag would skip the trial checkout.
    if (await hasSubscriptionAccess(user.stripeCustomerId)) {
      return NextResponse.json({ url: `${origin}/dashboard` });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: !user.stripeCustomerId ? user.email : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: days,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      },
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/promo/${days}`,
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
