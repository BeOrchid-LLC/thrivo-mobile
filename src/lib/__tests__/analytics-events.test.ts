import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The funnel the PRD tracks is only useful if every event actually fires and is
 * spelled the way the dashboard expects. Both failure modes are silent — a
 * missing call site produces no error, and a misspelled name produces a second,
 * near-identical event nobody notices until the funnel is wrong.
 *
 * This walks the source rather than the type system, because TypeScript already
 * guarantees the *names* are valid; what it cannot tell us is whether anything
 * ever calls them.
 */

const SRC = join(__dirname, "..", "..");

/**
 * Events the Remaining Scope PRD requires, plus `thrivo.checkin_submitted`.
 *
 * The check-in event is not in the PRD's list. It is kept deliberately: Step 5
 * makes check-ins a real feature with a mood-aware response, so submissions are
 * a funnel step worth counting, and the event already had a call site. Dropping
 * it would lose data for no gain. Recorded here rather than left as an open
 * question — see docs/remaining-scope-plan.md §Step 6.
 */
const REQUIRED_EVENTS = [
  "thrivo.signup",
  "thrivo.onboarding_completed",
  "thrivo.food_logged",
  "thrivo.barcode_scanned",
  "thrivo.paywall_viewed",
  "thrivo.upgrade_prompt_shown",
  "thrivo.trial_started",
  "thrivo.subscription_started",
  "thrivo.subscription_cancelled",
  "thrivo.reminder_set",
  "thrivo.checkin_submitted",
];

const UNION_FILE = join(SRC, "lib", "analytics.ts");

/**
 * Every source file *except* the union declaration itself.
 *
 * Excluding it is the whole point: with `lib/analytics.ts` in the corpus, an
 * event that is declared but never emitted still matched, so the check quietly
 * proved nothing. A call site now has to exist somewhere else.
 */
function sourceText(): string {
  const files = globSync("**/*.{ts,tsx}", { cwd: SRC })
    .filter((f) => !f.includes("__tests__") && join(SRC, f) !== UNION_FILE)
    .map((f) => readFileSync(join(SRC, f), "utf8"));
  return files.join("\n");
}

/** The event names actually declared in the closed union. */
function unionEvents(): string[] {
  const source = readFileSync(UNION_FILE, "utf8");
  const start = source.indexOf("export type AnalyticsEvent");
  const end = source.indexOf("export interface Analytics");
  return [...source.slice(start, end).matchAll(/"(thrivo\.[a-z_]+)"/g)].map((match) => match[1]);
}

describe("analytics funnel", () => {
  const source = sourceText();

  it.each(REQUIRED_EVENTS)("emits %s somewhere in the app", (event) => {
    expect(source).toContain(`"${event}"`);
  });

  it("keeps the closed union and the required list identical", () => {
    // Both directions. The forward check catches a required event dropped from
    // the union; the reverse catches an event added to the union without being
    // agreed here — which is how a name slips in that the dashboard never
    // expects, the exact drift the union is supposed to prevent.
    expect([...unionEvents()].sort()).toEqual([...REQUIRED_EVENTS].sort());
  });

  it("uses the agreed lowercase thrivo.* naming convention", () => {
    // Guards the convention the platform agreed in writing. `thrivo.signup` is
    // a single word by the PRD's own spelling, so one segment is allowed.
    for (const event of REQUIRED_EVENTS) {
      expect(event).toMatch(/^thrivo\.[a-z]+(_[a-z]+)*$/);
    }
  });
});
