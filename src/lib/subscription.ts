import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function hasSubscriptionAccess(customerId: string | null): Promise<boolean> {
  if (!customerId) return false;

  // Read current billing state: cached flags and webhook payloads can be stale.
  const subscriptions = stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  for await (const subscription of subscriptions) {
    if (subscription.status === "active") return true;
    if (
      subscription.status === "trialing" &&
      subscription.trial_end !== null &&
      subscription.trial_end * 1000 > Date.now()
    ) {
      return true;
    }
  }

  return false;
}
