import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import Stripe from "stripe";

// Compile the actual routes with isolated provider/database dependencies.
function loadSource(path, mocks) {
  const filename = fileURLToPath(new URL(`../src/${path}`, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  const require = createRequire(filename);
  compileFunction(source, ["require", "module", "exports"], { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

test("billing state controls generation and webhook reconciliation", async (t) => {
  const now = 1_800_000_000;
  t.mock.method(Date, "now", () => now * 1000);
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousPriceId = process.env.STRIPE_PRICE_ID;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local";
  t.after(() => {
    for (const [name, value] of [["STRIPE_WEBHOOK_SECRET", previousWebhookSecret], ["STRIPE_PRICE_ID", previousPriceId]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const user = { id: "user_local", stripeCustomerId: "cus_local", subscribed: true };
  let authenticatedUserId = "clerk_local";
  let subscriptions = [];
  let stripeFailure = false;
  const updates = [];
  const listCalls = [];
  const checkoutCalls = [];
  let modelCalls = 0;
  let savedPosts = 0;

  class StripeStub {
    subscriptions = {
      list: (params) => {
        listCalls.push(params);
        return (async function* () {
          if (stripeFailure) throw new Error("Billing unavailable");
          yield* subscriptions;
        })();
      },
    };
    webhooks = Stripe.webhooks;
    checkout = {
      sessions: {
        create: async (params) => {
          checkoutCalls.push(params);
          return { url: "https://checkout.stripe.com/test" };
        },
      },
    };
  }

  const mocks = {
    stripe: StripeStub,
    "@clerk/nextjs/server": { auth: async () => ({ userId: authenticatedUserId }) },
    "@/lib/resolve-user": { resolveUser: async () => user },
    "@/lib/db": {
      db: {
        user: {
          update: async (args) => updates.push(args),
          updateMany: async (args) => updates.push(args),
        },
        generatedPost: { create: async () => { savedPosts++; } },
      },
    },
    "@anthropic-ai/sdk": class {
      messages = {
        create: async () => {
          modelCalls++;
          return { content: [{ type: "text", text: "Generated content" }] };
        },
      };
    },
  };
  const policy = loadSource("lib/subscription.ts", mocks);
  mocks["@/lib/subscription"] = policy;
  mocks["@/lib/trial-days"] = loadSource("lib/trial-days.ts", mocks);
  const generate = loadSource("app/api/generate/route.ts", mocks);
  const status = loadSource("app/api/user/subscription/route.ts", mocks);
  const webhook = loadSource("app/api/stripe/webhook/route.ts", mocks);
  const promo = loadSource("app/api/stripe/promo/route.ts", mocks);
  const generationRequest = () => new Request("https://app.test/api/generate", {
    method: "POST",
    body: JSON.stringify({ businessName: "Test", location: "Test", keywords: "test", contentType: "blog" }),
  });

  await t.test("rejects unauthenticated generation before any billing or model call", async () => {
    authenticatedUserId = null;
    assert.equal((await generate.POST(generationRequest())).status, 401);
    assert.equal(listCalls.length, 0);
    assert.equal(modelCalls, 0);
    authenticatedUserId = "clerk_local";
  });

  const cases = [
    ["past_due", null, false],
    ["unpaid", null, false],
    ["paused", null, false],
    ["canceled", null, false],
    ["incomplete", null, false],
    ["incomplete_expired", null, false],
    ["trialing", now - 1, false],
    ["trialing", now, false],
    ["trialing", null, false],
    ["trialing", now + 1, true],
    ["active", now - 1, true],
  ];
  for (const [billingStatus, trialEnd, allowed] of cases) {
    await t.test(`${billingStatus}, trial_end=${trialEnd}: access=${allowed}`, async () => {
      subscriptions = [{ status: billingStatus, trial_end: trialEnd }];
      // Neither stale true nor stale false may override current billing state.
      user.subscribed = !allowed;
      const previousModelCalls = modelCalls;
      const previousSavedPosts = savedPosts;
      const response = await generate.POST(generationRequest());
      assert.equal(response.status, allowed ? 200 : 403);
      assert.equal(modelCalls - previousModelCalls, Number(allowed));
      assert.equal(savedPosts - previousSavedPosts, Number(allowed));
      assert.deepEqual(await (await status.GET()).json(), { subscribed: allowed });
      assert.deepEqual(listCalls.at(-1), { customer: "cus_local", status: "all", limit: 100 });
    });
  }

  await t.test("denies stale subscribed accounts with no billing identity or subscriptions", async () => {
    user.subscribed = true;
    user.stripeCustomerId = null;
    const previousListCalls = listCalls.length;
    assert.equal((await generate.POST(generationRequest())).status, 403);
    assert.equal(listCalls.length, previousListCalls);
    user.stripeCustomerId = "cus_local";
    subscriptions = [];
    assert.equal((await generate.POST(generationRequest())).status, 403);
  });

  await t.test("checks every subscription rather than only the first", async () => {
    subscriptions = [
      ...Array.from({ length: 100 }, () => ({ status: "canceled", trial_end: null })),
      { status: "active", trial_end: null },
    ];
    assert.equal(await policy.hasSubscriptionAccess("cus_local"), true);
  });

  await t.test("billing failures never reach the model or save a post", async () => {
    stripeFailure = true;
    const previousModelCalls = modelCalls;
    const previousSavedPosts = savedPosts;
    const quiet = t.mock.method(console, "error", () => {});
    try {
      assert.equal((await generate.POST(generationRequest())).status, 500);
      assert.equal((await status.GET()).status, 500);
      assert.equal(modelCalls, previousModelCalls);
      assert.equal(savedPosts, previousSavedPosts);
    } finally {
      quiet.mock.restore();
      stripeFailure = false;
    }
  });

  async function deliver(type, object, validSignature = true) {
    const payload = JSON.stringify({ id: "evt_local", type, data: { object } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_local", timestamp: now });
    return webhook.POST(new Request("https://app.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": validSignature ? signature : "invalid" },
      body: payload,
    }));
  }

  await t.test("webhook signature verification precedes any updates", async () => {
    assert.equal((await deliver("checkout.session.completed", {}, false)).status, 400);
    assert.equal(updates.length, 0);
  });

  await t.test("delayed checkout completion cannot reactivate an expired trial", async () => {
    subscriptions = [{ status: "past_due", trial_end: now - 1 }];
    assert.equal((await deliver("checkout.session.completed", {
      mode: "subscription", metadata: { userId: user.id }, customer: "cus_local",
    })).status, 200);
    assert.deepEqual(updates.at(-1), {
      where: { id: user.id }, data: { stripeCustomerId: "cus_local", subscribed: false },
    });
  });

  for (const eventType of ["created", "updated", "paused", "resumed", "deleted"]) {
    await t.test(`subscription.${eventType} reconciles current state, ignoring old event status`, async () => {
      subscriptions = [{ status: "past_due", trial_end: now - 1 }];
      await deliver(`customer.subscription.${eventType}`, { customer: "cus_local", status: "trialing" });
      assert.deepEqual(updates.at(-1), { where: { stripeCustomerId: "cus_local" }, data: { subscribed: false } });
    });
  }

  await t.test("subscription deletion retains access from another active subscription", async () => {
    subscriptions = [{ status: "active", trial_end: null }];
    await deliver("customer.subscription.deleted", { customer: "cus_local", status: "canceled" });
    assert.equal(updates.at(-1).data.subscribed, true);
  });

  await t.test("invoice events use the configured API shape and current subscription status", async () => {
    const invoice = { customer: "cus_local", parent: { subscription_details: { subscription: "sub_local" } } };
    subscriptions = [{ status: "past_due", trial_end: now - 1 }];
    await deliver("invoice.payment_succeeded", invoice);
    assert.equal(updates.at(-1).data.subscribed, false);
    await deliver("invoice.payment_failed", invoice);
    assert.equal(updates.at(-1).data.subscribed, false);
    subscriptions = [{ status: "active", trial_end: now - 1 }];
    await deliver("invoice.payment_succeeded", invoice);
    assert.equal(updates.at(-1).data.subscribed, true);
    const previousUpdates = updates.length;
    await deliver("invoice.payment_succeeded", { customer: "cus_local", parent: null });
    assert.equal(updates.length, previousUpdates);
  });

  await t.test("new no-card trials cancel at expiry even when the cached flag is stale", async () => {
    process.env.STRIPE_PRICE_ID = "price_local";
    subscriptions = [{ status: "past_due", trial_end: now - 1 }];
    user.subscribed = true;
    const response = await promo.POST(new Request("https://app.test/api/stripe/promo", {
      method: "POST", body: JSON.stringify({ days: 7 }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(checkoutCalls.at(-1).subscription_data, {
      trial_period_days: 7,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    });
    assert.equal(checkoutCalls.at(-1).payment_method_collection, "if_required");
  });

  await t.test("promo accepts a 1-day trial", async () => {
    process.env.STRIPE_PRICE_ID = "price_local";
    subscriptions = [];
    const response = await promo.POST(new Request("https://app.test/api/stripe/promo", {
      method: "POST", body: JSON.stringify({ days: 1 }),
    }));
    assert.equal(response.status, 200);
    assert.equal(checkoutCalls.at(-1).subscription_data.trial_period_days, 1);
  });

  // Bad bodies are sent back to the dashboard, never defaulted to a free trial.
  for (const [label, body] of [["malformed JSON", "{not json"], ["empty body", ""], ["JSON null", "null"], ["JSON array", "[]"]]) {
    await t.test(`promo sends ${label} back to the dashboard and creates no session`, async () => {
      process.env.STRIPE_PRICE_ID = "price_local";
      subscriptions = [];
      const sessionsBefore = checkoutCalls.length;
      const response = await promo.POST(new Request("https://app.test/api/stripe/promo", { method: "POST", body }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).url, /\/dashboard$/);
      assert.equal(checkoutCalls.length, sessionsBefore);
    });
  }

  // An unlisted or wrongly typed days value is an invalid request: no default trial, ever.
  for (const [label, body] of [["unlisted number", { days: 5 }], ["numeric string", { days: "7" }], ["missing days", {}], ["null days", { days: null }], ["negative days", { days: -7 }]]) {
    await t.test(`promo sends ${label} back to the dashboard and creates no session`, async () => {
      process.env.STRIPE_PRICE_ID = "price_local";
      subscriptions = [];
      const sessionsBefore = checkoutCalls.length;
      const response = await promo.POST(new Request("https://app.test/api/stripe/promo", { method: "POST", body: JSON.stringify(body) }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).url, /\/dashboard$/);
      assert.equal(checkoutCalls.length, sessionsBefore);
    });
  }
});
