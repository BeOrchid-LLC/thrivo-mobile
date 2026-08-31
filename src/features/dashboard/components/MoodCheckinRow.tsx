import { Pressable, View } from "react-native";
import { Text } from "@/components";
import type { Mood } from "@/contracts";
// Deep imports, not the feature barrel: `@/features/checkin` re-exports
// `CheckinScreen`, which imports back from `@/features/dashboard` — going
// through the barrel closes that loop and leaves the dashboard's own exports
// half-initialised at module-eval time.
import { MOOD_SCALE, moodOption } from "@/features/checkin/utils/mood-scale";

interface MoodCheckinRowProps {
  onSelect: (mood: Mood) => void;
  /** Blocks further taps while a check-in write is in flight. */
  disabled?: boolean;
}

/**
 * The dashboard's one-tap check-in: the mood scale, low → high.
 *
 * A tap writes the check-in outright — no confirm step — and the row is replaced
 * by `MoodCheckinSummary` on the tap itself rather than when the write lands, so
 * the answer never sits there looking unregistered. The check-in screen is still
 * where a note and the returned tip live; this is the prompt that makes
 * answering cost nothing.
 */
export function MoodCheckinRow({ onSelect, disabled = false }: MoodCheckinRowProps) {
  return (
    <View className="gap-md">
      <Text variant="body" color="subtle">
        How are you feeling today?
      </Text>
      <View className="flex-row justify-between">
        {MOOD_SCALE.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`Feeling ${option.label.toLowerCase()}`}
            onPress={() => onSelect(option.value)}
            disabled={disabled}
            className="items-center gap-xs"
          >
            <View className="h-moodTile w-moodTile items-center justify-center rounded-pill bg-gray-100">
              <Text variant="heading2">{option.emoji}</Text>
            </View>
            <Text variant="label" color="subtle">
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Once today is answered, the row collapses to a single line (Figma). */
export function MoodCheckinSummary({ mood, onPress }: { mood: Mood; onPress: () => void }) {
  const option = moodOption(mood);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Feeling ${option.label.toLowerCase()}, logged. Open today's check-in`}
      onPress={onPress}
      className="min-h-touchTarget flex-row items-center gap-sm"
    >
      <Text variant="heading2">{option.emoji}</Text>
      <Text variant="body" color="subtle">
        Feeling {option.label.toLowerCase()} • logged
      </Text>
    </Pressable>
  );
}
