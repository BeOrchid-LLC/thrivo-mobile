import { View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Centered error view with optional retry. Paired with LoadingState so every
 * screen handles loading + error explicitly (MOBILE_ARCHITECTURE §7).
 */
export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
  retryLabel = "Retry",
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-sm p-xl" accessibilityRole="alert">
      <Text variant="heading3" color="dark">
        {title}
      </Text>
      <Text variant="body" color="muted" className="mb-md text-center">
        {message}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} variant="secondary" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}
