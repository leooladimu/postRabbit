import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");

// Execute the actual handlers with isolated configuration and mocked providers.
function loadRoute(t, route, { appUrl, signedIn = true, subscribed = false }) {
  const createSession = t.mock.fn(async () => ({
    url: "https://checkout.stripe.com/test-session",
  }));
  const resolveUser = t.mock.fn(async () => ({
    id: "user_test",
    email: "user@example.test",
    subscribed,
  }));
  const modules = {
    "next/server": { NextRequest, NextResponse },
    "@clerk/nextjs/server": {
      auth: async () => ({ userId: signedIn ? "clerk_test" : null }),
    },
    "@/lib/resolve-user": { resolveUser },
    stripe: class Stripe {
      checkout = { sessions: { create: createSession } };
    },
  };
  const source = readFileSync(
    new URL(`../src/app/api/stripe/${route}/route.ts`, import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const context = {
    exports: {},
    require: (name) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    },
    process: { env: { NEXT_PUBLIC_APP_URL: appUrl, STRIPE_PRICE_ID: "price_test" } },
    console,
  };
  runInNewContext(outputText, context);
  return { POST: context.exports.POST, createSession, resolveUser };
}

function request(route, origin) {
  return new NextRequest(`https://untrusted-host.example/api/stripe/${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
      ...(origin === undefined ? {} : { origin }),
    },
    body: JSON.stringify({ days: 14 }),
  });
}

for (const appUrl of ["https://app.example", undefined]) {
  const expectedBase = appUrl || "https://postrabbit.oleo.dev";

  for (const origin of ["https://attacker.example", "null", undefined]) {
    for (const route of ["checkout", "promo"]) {
      test(`${route}: app URL ${appUrl}, Origin ${origin}`, async (t) => {
        const { POST, createSession } = loadRoute(t, route, { appUrl });
        const response = await POST(request(route, origin));

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          url: "https://checkout.stripe.com/test-session",
        });
        assert.equal(createSession.mock.callCount(), 1);
        const [params] = createSession.mock.calls[0].arguments;
        assert.equal(params.success_url, `${expectedBase}/dashboard?success=true`);
        assert.equal(
          params.cancel_url,
          route === "checkout"
            ? `${expectedBase}/dashboard?canceled=true`
            : `${expectedBase}/promo/14`,
        );
      });
    }

    test(`subscribed promo: app URL ${appUrl}, Origin ${origin}`, async (t) => {
      const { POST, createSession } = loadRoute(t, "promo", { appUrl, subscribed: true });
      const response = await POST(request("promo", origin));

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { url: `${expectedBase}/dashboard` });
      assert.equal(createSession.mock.callCount(), 0);
    });
  }
}

for (const route of ["checkout", "promo"]) {
  test(`${route}: requires authentication before creating a session`, async (t) => {
    const { POST, createSession, resolveUser } = loadRoute(t, route, { signedIn: false });
    const response = await POST(request(route, "https://attacker.example"));

    assert.equal(response.status, 401);
    assert.equal(resolveUser.mock.callCount(), 0);
    assert.equal(createSession.mock.callCount(), 0);
  });
}
