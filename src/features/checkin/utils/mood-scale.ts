import type { Mood } from "@/contracts";

export interface MoodOption {
  value: Mood;
  emoji: string;
  label: string;
}

/**
 * The one mood vocabulary: emoji + label per backend enum value.
 *
 * The dashboard row and the check-in screen both draw this scale, in opposite
 * directions — so it lives here rather than in either screen. When the two owned
 * their own arrays, "bad" could be "Bad" on one surface and "Rough" on the
 * other, which reads as two different questions.
 *
 * Ordered low → high, the direction the dashboard row runs left to right.
 */
export const MOOD_SCALE: readonly MoodOption[] = [
  { value: "bad", emoji: "😒", label: "Rough" },
  { value: "low", emoji: "🙁", label: "Low" },
  { value: "ok", emoji: "😐", label: "Okay" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "😄", label: "Great" },
];

export const moodOption = (mood: Mood): MoodOption =>
  MOOD_SCALE.find((option) => option.value === mood) ?? MOOD_SCALE[2];
