// Single source of truth for promo trial lengths, shared by the promo page and API route
// so the two can never disagree about what a valid trial is.
export const ALLOWED_TRIAL_DAYS = [1, 7, 14, 30];

export function isAllowedTrialDays(value: unknown): value is number {
  return typeof value === "number" && ALLOWED_TRIAL_DAYS.includes(value);
}

// Match the URL segment as exact text ("07", "7.0", "0x7" and " 7" must not count) and
// return null for anything else: callers redirect on null, never fall back to a default.
export function parseTrialDaysParam(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  return ALLOWED_TRIAL_DAYS.find((days) => String(days) === raw) ?? null;
}

// Where to send someone who landed on an invalid promo URL. Only signed-in users have a
// dashboard (it's behind auth), so everyone else goes to the home page and its sign-up button.
export function invalidTrialRedirectPath(isSignedIn: boolean | undefined): string {
  return isSignedIn ? "/dashboard" : "/";
}
