import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

// A DOM has to exist before React and Testing Library load.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://app.test/dashboard" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Node", "MutationObserver", "getComputedStyle"]) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: key === "window" ? dom.window : dom.window[key],
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const require = createRequire(import.meta.url);
const React = require("react");
const { cleanup, render, screen } = await import("@testing-library/react");

// Compile a real page; only Clerk and Next's router/link are stubbed.
function loadPage(path) {
  const filename = fileURLToPath(new URL(`../src/app/${path}`, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const mocks = {
    "@clerk/nextjs": {
      useUser: () => ({ user: { firstName: "Leo" }, isLoaded: true }),
      UserButton: () => null,
    },
    "next/navigation": { useRouter: () => ({ push() {}, replace() {} }) },
    "next/link": { __esModule: true, default: ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children) },
  };
  const loadedModule = { exports: {} };
  compileFunction(source, ["require", "module", "exports"], { filename })(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports.default;
}

function stubFetch(subscriptionResponse) {
  globalThis.fetch = async (url) => {
    if (url === "/api/user/subscription") return subscriptionResponse();
    if (url === "/api/content/history") return Response.json({ posts: [] });
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

const BANNER = "Subscribe to Start Generating Content";
// Compare booleans: a failing assert on a jsdom element tries to print the whole window and runs out of memory.
const shows = (text) => screen.queryByText(text) !== null;
const Dashboard = loadPage("dashboard/page.tsx");
const Settings = loadPage("settings/page.tsx");

afterEach(() => cleanup());

test("unsubscribed users see the subscribe banner", async () => {
  stubFetch(() => Response.json({ subscribed: false }));
  render(React.createElement(Dashboard));
  await screen.findByText(/Welcome back/);
  assert.equal(shows(BANNER), true);
});

test("subscribed users never see the subscribe banner", async () => {
  stubFetch(() => Response.json({ subscribed: true }));
  render(React.createElement(Dashboard));
  await screen.findByText(/Welcome back/);
  assert.equal(shows(BANNER), false);
});

// A failed plan check says nothing about the user, so it must not tell a paying user to subscribe.
for (const [label, response] of [
  ["a 500 from the status endpoint", () => Response.json({ error: "Failed to check subscription" }, { status: 500 })],
  ["a network failure", () => { throw new TypeError("Failed to fetch"); }],
]) {
  test(`${label} shows a retry notice, not the subscribe banner`, async (t) => {
    t.mock.method(console, "error", () => {});
    stubFetch(response);
    render(React.createElement(Dashboard));
    await screen.findByText(/Welcome back/);
    assert.equal(shows(BANNER), false);
    assert.equal(shows(/couldn't check your plan/i), true);
  });
}

const failures = [
  ["a 500 from the status endpoint", () => Response.json({ error: "Failed to check subscription" }, { status: 500 })],
  ["a network failure", () => { throw new TypeError("Failed to fetch"); }],
];

test("settings shows unsubscribed users Inactive and Subscribe Now", async () => {
  stubFetch(() => Response.json({ subscribed: false }));
  render(React.createElement(Settings));
  await screen.findByText(/Manage your account/);
  assert.equal(shows("Inactive"), true);
  assert.equal(shows("Subscribe Now"), true);
  assert.equal(shows("Cancel Subscription"), false);
});

test("settings shows subscribed users Active and Cancel Subscription", async () => {
  stubFetch(() => Response.json({ subscribed: true }));
  render(React.createElement(Settings));
  await screen.findByText(/Manage your account/);
  assert.equal(shows("Active"), true);
  assert.equal(shows("Cancel Subscription"), true);
  assert.equal(shows("Subscribe Now"), false);
});

// Unknown plan: claiming Inactive could hide a paying user's Cancel button, claiming Active
// could show Cancel to someone with nothing to cancel. Show neither, just the retry notice.
for (const [label, response] of failures) {
  test(`settings: ${label} shows a retry notice and no plan status`, async (t) => {
    t.mock.method(console, "error", () => {});
    stubFetch(response);
    render(React.createElement(Settings));
    await screen.findByText(/Manage your account/);
    assert.equal(shows(/couldn't check your plan/i), true);
    assert.equal(shows("Inactive"), false);
    assert.equal(shows("Subscribe Now"), false);
    assert.equal(shows("Active"), false);
    assert.equal(shows("Cancel Subscription"), false);
  });
}
