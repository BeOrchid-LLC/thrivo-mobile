import { ActivityIndicator, Modal, View } from "react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface BlockingLoaderProps {
  visible: boolean;
  /** Says what is happening, so a held screen never looks like a hang. */
  message?: string;
}

/**
 * Full-screen, un-dismissable loading overlay.
 *
 * The counterpart to `LoadingState`: that fills a screen's body while a query
 * runs and leaves the header and footer live. This covers the whole screen and
 * swallows every touch, for the flows where interacting mid-flight is the bug —
 * a store purchase between "charged" and "activated", where a back tap or a
 * second press on the buy button costs the user real money.
 *
 * `onRequestClose` is deliberately a no-op: Android's hardware back must not
 * dismiss it either.
 */
export function BlockingLoader({ visible, message }: BlockingLoaderProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View
        className="flex-1 items-center justify-center gap-lg bg-black/50 px-xl"
        accessibilityRole="progressbar"
        accessibilityLabel={message ?? "Working"}
      >
        <ActivityIndicator size="large" color={colors.white} />
        {message ? (
          <Text variant="body-sm" color="inverse" className="text-center">
            {message}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}
