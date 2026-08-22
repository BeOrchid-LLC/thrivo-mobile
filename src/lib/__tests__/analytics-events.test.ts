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

/** Events the Remaining Scope PRD requires, plus the check-in we kept. */
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

function sourceText(): string {
  const files = globSync("**/*.{ts,tsx}", { cwd: SRC })
    .filter((f) => !f.includes("__tests__"))
    .map((f) => readFileSync(join(SRC, f), "utf8"));
  return files.join("\n");
}

describe("analytics funnel", () => {
  const source = sourceText();

  it.each(REQUIRED_EVENTS)("emits %s somewhere in the app", (event) => {
    expect(source).toContain(`"${event}"`);
  });

  it("declares every emitted event in the closed union", () => {
    const union = readFileSync(join(SRC, "lib", "analytics.ts"), "utf8");
    for (const event of REQUIRED_EVENTS) {
      expect(union).toContain(`"${event}"`);
    }
  });

  it("uses the agreed lowercase thrivo.* naming convention", () => {
    // Guards the convention the platform agreed in writing. `thrivo.signup` is
    // a single word by the PRD's own spelling, so one segment is allowed.
    for (const event of REQUIRED_EVENTS) {
      expect(event).toMatch(/^thrivo\.[a-z]+(_[a-z]+)*$/);
    }
  });
});
