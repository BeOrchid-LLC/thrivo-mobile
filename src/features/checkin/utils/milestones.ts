/**
 * Streak milestones celebrated on the check-in screen.
 *
 * Derived from `currentStreakDays`, which the backend already computes and the
 * dashboard already reads — the app is not counting anything of its own here, so
 * there is nothing to drift.
 *
 * Only an **exact** hit celebrates. Anything else ("30 or more") would re-fire
 * the same congratulation every day afterwards, which reads as a bug and cheapens
 * the moment it is meant to mark.
 */
export interface Milestone {
  days: number;
  title: string;
  body: string;
}

const MILESTONES: Milestone[] = [
  {
    days: 3,
    title: "Three days running",
    body: "A streak starts by being unremarkable three times. You are past the hardest part.",
  },
  {
    days: 7,
    title: "A full week",
    body: "Seven days of showing up. That is a habit forming, not a fluke.",
  },
  {
    days: 14,
    title: "Two weeks",
    body: "Fourteen days. Long enough that this is starting to feel like how you do things.",
  },
  {
    days: 30,
    title: "Thirty days",
    body: "A month of check-ins. Whatever else changed, you kept turning up.",
  },
  {
    days: 60,
    title: "Two months",
    body: "Sixty days. Most people never see this number — you are well past novelty.",
  },
  {
    days: 100,
    title: "One hundred days",
    body: "Three figures. This is not motivation any more; it is just what you do.",
  },
  {
    days: 365,
    title: "A full year",
    body: "Three hundred and sixty-five days. There is nothing left to prove.",
  },
];

export function milestoneFor(streakDays: number): Milestone | null {
  return MILESTONES.find((milestone) => milestone.days === streakDays) ?? null;
}
