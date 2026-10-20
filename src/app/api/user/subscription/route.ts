import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveUser } from "@/lib/resolve-user";
import { hasSubscriptionAccess } from "@/lib/subscription";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveUser(userId, { createIfMissing: true });

    const subscribed = await hasSubscriptionAccess(user!.stripeCustomerId);
    return NextResponse.json({ subscribed });
  } catch (error) {
    console.error("Subscription check error:", error);
    return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 });
  }
}
