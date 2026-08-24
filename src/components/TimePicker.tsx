import { useEffect, useState, type ComponentProps } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import NativeDateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors } from "@/theme";
import { Text } from "./Text";

type NativeDateTimePickerProps = ComponentProps<typeof NativeDateTimePicker>;

export type TimePickerEvent = DateTimePickerEvent;
export type TimePickerProps = Omit<NativeDateTimePickerProps, "display" | "mode"> & {
  /** Sheet heading, iOS only. */
  title?: string;
};

/** Synthesises the event shape callers already branch on (`event.type`). */
function timeEvent(type: "set" | "dismissed", date: Date): DateTimePickerEvent {
  return {
    type,
    nativeEvent: { timestamp: date.getTime(), utcOffset: -date.getTimezoneOffset() },
  } as DateTimePickerEvent;
}

/**
 * App-wide native time picker.
 *
 * **Android** gets the platform time dialog, which is already modal and already
 * confirms — nothing to add.
 *
 * **iOS** needs both halves of this wrapper, because the raw spinner has two
 * behaviours that are wrong wherever it is mounted:
 *
 * 1. `display="spinner"` renders **inline in the layout**, not as an overlay. On
 *    the Settings screen the picker is mounted at the very bottom of the scroll,
 *    so tapping a reminder row appended a bare wheel far below the row that
 *    opened it — no title, no confirm, no visible connection to the tap.
 * 2. It fires `onChange` with `type: "set"` on **every scroll tick**. Callers
 *    reasonably treat the first `"set"` as the user's answer, so a single nudge
 *    of the wheel closed the picker and saved a half-scrolled time.
 *
 * So on iOS the spinner is presented in a real modal and the value is held
 * locally: exactly one `"set"` is emitted, on Done, and `"dismissed"` on Cancel
 * or a backdrop tap. Call sites are unchanged — they still branch on
 * `event.type` and receive the confirmed date.
 */
export function TimePicker({ title = "Select time", value, onChange, ...rest }: TimePickerProps) {
  const initial = value instanceof Date ? value : new Date();
  const [draft, setDraft] = useState(initial);

  // Re-seed when reopened for a different field — the component stays mounted
  // across edits in some call sites.
  useEffect(() => {
    if (value instanceof Date) setDraft(value);
  }, [value]);

  if (Platform.OS !== "ios") {
    return (
      <NativeDateTimePicker
        {...rest}
        value={initial}
        mode="time"
        display="default"
        onChange={onChange}
      />
    );
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => onChange?.(timeEvent("dismissed", draft), draft)}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancel ${title}`}
          onPress={() => onChange?.(timeEvent("dismissed", draft), draft)}
          className="absolute inset-0 bg-dark/40"
        />
        <View className="rounded-t-xl bg-white pb-xl">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-lg py-sm">
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange?.(timeEvent("dismissed", draft), draft)}
              className="min-h-touchTarget justify-center"
            >
              <Text variant="body" color="muted">
                Cancel
              </Text>
            </Pressable>
            <Text variant="body" color="dark" className="font-semibold">
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange?.(timeEvent("set", draft), draft)}
              className="min-h-touchTarget justify-center"
            >
              <Text variant="body" color="primary" className="font-semibold">
                Done
              </Text>
            </Pressable>
          </View>
          <NativeDateTimePicker
            {...rest}
            value={draft}
            mode="time"
            display="spinner"
            textColor={colors.dark}
            onChange={(_event, date) => {
              if (date) setDraft(date);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
