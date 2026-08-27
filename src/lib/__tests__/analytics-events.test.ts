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
 * Events the Remaining Scope PRD requires, plus three agreed additions.
 *
 * The check-in event is not in the PRD's list. It is kept deliberately: Step 5
 * makes check-ins a real feature with a mood-aware response, so submissions are
 * a funnel step worth counting, and the event already had a call site. Dropping
 * it would lose data for no gain. Recorded here rather than left as an open
 * question — see docs/remaining-scope-plan.md §Step 6.
 *
 * `thrivo.custom_food_created` and `thrivo.log_copied` come with the Step 4
 * food-logging features. Each shipped feature that can carry the log deserves
 * its own funnel step: without them, a custom food and a copied day are
 * indistinguishable from ordinary catalog logs in the funnel. `log_copied`
 * fires once per copy action (scope: day | meal), not once per item — the items
 * are already counted by `thrivo.food_logged`.
 */
const REQUIRED_EVENTS = [
  "thrivo.signup",
  "thrivo.onboarding_completed",
  "thrivo.food_logged",
  "thrivo.custom_food_created",
  "thrivo.log_copied",
  "thrivo.barcode_scanned",
  "thrivo.paywall_viewed",
  "thrivo.upgrade_prompt_shown",
  "thrivo.trial_started",
  "thrivo.subscription_started",
  "thrivo.subscription_management_opened",
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

/**
 * Events whose `capture` call legitimately lives inside `lib/analytics.ts`, keyed
 * by the trigger that must exist outside it.
 *
 * `thrivo.signup` is emitted from `identify()` rather than at the call site, so
 * that PostHog has resolved the user before the event lands and it attaches to
 * the right person instead of the anonymous pre-auth id. The screen therefore
 * calls `queueSignup()` and the emit happens later — which means the corpus
 * check has to follow the trigger, not the literal, or it reports a working
 * funnel step as missing.
 */
const DEFERRED_EMITTERS: Record<string, string> = {
  "thrivo.signup": "queueSignup()",
};

describe("analytics funnel", () => {
  const source = sourceText();

  it.each(REQUIRED_EVENTS)("emits %s somewhere in the app", (event) => {
    const trigger = DEFERRED_EMITTERS[event];
    if (trigger) {
      // The emit is in the union file; assert both halves so an orphaned
      // trigger or an unreachable capture still fails.
      expect(readFileSync(UNION_FILE, "utf8")).toContain(`"${event}"`);
      expect(source).toContain(trigger);
      return;
    }
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
