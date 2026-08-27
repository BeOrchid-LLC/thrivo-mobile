import type { Mood } from "@/contracts";

/**
 * How the app *responds* to a mood — not which tip is shown.
 *
 * The psychology tip itself is server-selected (`checkin.tip` in the contract is
 * documented as "server-selected psychology tip returned for the chosen mood /
 * day"), and the 30-tip bank lives with the backend so it can be edited without
 * an app release. That is the right split, but it left the app with a single
 * flat acknowledgement — "Thanks for checking in — feeling bad." — rendered
 * identically whether someone had their best day of the month or their worst.
 *
 * This is the app's half: the framing around the tip. It is presentation, not a
 * shared business rule, so it belongs here rather than behind the API. It also
 * means a low vs. positive mood already reads differently before the bank lands,
 * and it degrades honestly — when the backend returns `tip: null`, this copy is
 * what the user gets instead of an empty card.
 */
export type MoodTone = "positive" | "steady" | "low";

export interface MoodResponse {
  tone: MoodTone;
  heading: string;
  body: string;
}

const RESPONSES: Record<Mood, MoodResponse> = {
  great: {
    tone: "positive",
    heading: "Brilliant — hold onto this one.",
    body: "Days like this are worth noticing. Whatever made today work is usually worth repeating.",
  },
  good: {
    tone: "positive",
    heading: "Good to hear.",
    body: "Steady days are what progress actually looks like. Nothing dramatic required.",
  },
  ok: {
    tone: "steady",
    heading: "Thanks for checking in.",
    body: "An okay day still counts. Showing up on the flat days is most of the work.",
  },
  low: {
    tone: "low",
    heading: "Thanks for being honest.",
    body: "Low days pass. You checked in anyway, and that is the part that matters.",
  },
  bad: {
    tone: "low",
    heading: "That sounds like a hard one.",
    body: "You still showed up today. Try to be as kind to yourself as you would be to a friend.",
  },
};

export function moodResponse(mood: Mood): MoodResponse {
  return RESPONSES[mood];
}
