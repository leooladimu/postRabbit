import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { clerkId: userId } });

    // Fallback: find by email and update clerkId (handles test→live Clerk key migration)
    if (!user) {
      const client = await clerkClient();
      const userData = await client.users.getUser(userId);
      const email = userData.emailAddresses[0]?.emailAddress || "";

      const existingByEmail = await db.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await db.user.update({
          where: { email },
          data: { clerkId: userId },
        });
      }
    }

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    // Cancel the subscription
    await stripe.subscriptions.cancel(subscriptions.data[0].id);

    // Update user in database
    await db.user.update({
      where: { id: user.id },
      data: { subscribed: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
