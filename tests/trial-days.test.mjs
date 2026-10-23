import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import test from "node:test";
import ts from "typescript";

function loadTrialDays() {
  const filename = fileURLToPath(new URL("../src/lib/trial-days.ts", import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  compileFunction(source, ["module", "exports"], { filename })(loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

test("parseTrialDaysParam accepts only the exact allowed day counts", () => {
  const { parseTrialDaysParam } = loadTrialDays();
  for (const days of [1, 7, 14, 30]) {
    assert.equal(parseTrialDaysParam(String(days)), days);
  }
});

// A wrong URL must never map to any trial length, so the page can send it to the dashboard.
test("parseTrialDaysParam rejects everything else", () => {
  const { parseTrialDaysParam } = loadTrialDays();
  for (const raw of ["", "0", "5", "99", "-7", "07", "7.0", "0x7", "1e1", " 7", "7 ", "30abc", "abc", "NaN", "Infinity", undefined, null, ["7"], 7]) {
    assert.equal(parseTrialDaysParam(raw), null, `expected null for ${JSON.stringify(raw)}`);
  }
});

test("isAllowedTrialDays accepts only allowed numbers", () => {
  const { isAllowedTrialDays } = loadTrialDays();
  for (const days of [1, 7, 14, 30]) assert.equal(isAllowedTrialDays(days), true);
  for (const value of [0, 5, -7, "7", null, undefined, NaN, 7.5]) assert.equal(isAllowedTrialDays(value), false);
});

// Signed-in users have a dashboard; logged-out visitors don't, so they get the home page.
test("invalidTrialRedirectPath sends signed-in users to the dashboard and everyone else home", () => {
  const { invalidTrialRedirectPath } = loadTrialDays();
  assert.equal(invalidTrialRedirectPath(true), "/dashboard");
  assert.equal(invalidTrialRedirectPath(false), "/");
  assert.equal(invalidTrialRedirectPath(undefined), "/");
});
