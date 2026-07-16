import type { ComponentProps } from "react";
import { Platform } from "react-native";
import NativeDateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type NativeDateTimePickerProps = ComponentProps<typeof NativeDateTimePicker>;

export type TimePickerEvent = DateTimePickerEvent;
export type TimePickerProps = Omit<NativeDateTimePickerProps, "display" | "mode">;

/**
 * App-wide native time picker. Mirrors the meal-reminder picker: iOS uses the
 * spinner presentation, while Android uses the platform default time dialog.
 */
export function TimePicker(props: TimePickerProps) {
  return (
    <NativeDateTimePicker
      {...props}
      mode="time"
      display={Platform.OS === "ios" ? "spinner" : "default"}
    />
  );
}
