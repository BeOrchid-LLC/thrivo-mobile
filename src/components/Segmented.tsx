import { Pressable, View, type ViewStyle } from "react-native";
import { Text, type TextColor } from "./Text";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  /** `undefined` renders with no segment selected (e.g. an unanswered choice). */
  value: T | undefined;
  onChange: (value: T) => void;
  /** Label colour of the selected segment. Defaults to the neutral dark. */
  activeColor?: TextColor;
  /**
   * "default" is the S3 unit pill (14, Figma 20:187); "compact" the smaller one
   * S4 sits beside a field label; "large" the Food/Water tab pill (16, 46:479),
   * whose track also carries 4pt of horizontal padding rather than 3; "count"
   * the taller reminders-per-day picker on S7 (40pt segments in a 12 track).
   */
  size?: "default" | "compact" | "large" | "count";
  /** Stretch the track across the row (S3). Otherwise it hugs its segments (S4). */
  fullWidth?: boolean;
  /** Ring the selected segment in green — the S6 plan toggle draws it that way. */
  activeBordered?: boolean;
  /**
   * Split the track evenly between segments (46:478/46:480 are each ~half of
   * the 350pt track). Off by default: the onboarding unit pill stretches its
   * track but lets "lbs"/"kg" keep their own widths.
   */
  equalSegments?: boolean;
  style?: ViewStyle;
}

// iOS-style track + selected thumb shadow (V2 — Figma node 20:168). RN shadow has
// no className equivalent, so it stays an inline style on the active segment.
const thumbShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 1.5,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

/**
 * Compact segmented control (single-select). Used for unit (kg/lb), sex, and the
 * dashboard tier toggle. V2 style: a soft track with a white selected thumb +
 * subtle shadow; tokens only.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeColor = "dark",
  size = "default",
  fullWidth = false,
  activeBordered = false,
  equalSegments = false,
  style,
}: SegmentedProps<T>) {
  const trackPadding =
    size === "compact"
      ? "rounded-chip p-[2px]"
      : size === "count"
        ? "rounded-tile p-[3px]"
        : size === "large"
          ? "rounded-md px-[4px] py-[3px]"
          : "rounded-md p-[3px]";
  // Every frame draws these labels semibold; `label`/`body` are the regular
  // ramp entries, so the weight comes from the class.
  const labelVariant =
    size === "compact" ? "caption" : size === "large" || size === "count" ? "body" : "label";
  return (
    <View
      className={`flex-row bg-segmentTrack ${trackPadding} ${
        fullWidth ? "self-stretch" : "self-start"
      }`}
      style={style}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={`items-center justify-center px-[10px] ${
              size === "compact"
                ? "min-h-[27.5px] rounded-[6px]"
                : size === "count"
                  ? "min-h-[40px] rounded-md"
                  : "min-h-[33px] rounded-chip"
            } ${equalSegments ? "flex-1" : ""} ${active ? `bg-white ${activeBordered ? "border border-primaryBright" : ""}` : ""}`}
            style={active ? thumbShadow : undefined}
          >
            <Text
              variant={labelVariant}
              color={active ? activeColor : "subtle"}
              className={size === "count" ? "font-bold" : "font-semibold"}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
