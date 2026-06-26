import { View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";

export interface SectionErrorProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Compact, local error state for one section without blocking the full screen. */
export function SectionError({
  title,
  message = "Please try again.",
  onRetry,
  retryLabel = "Retry",
  className,
}: SectionErrorProps) {
  return (
    <View
      accessibilityRole="alert"
      className={`gap-sm rounded-lg border border-gray-200 bg-white p-lg ${className ?? ""}`}
    >
      <Text variant="heading3" color="dark">
        {title}
      </Text>
      <Text variant="body" color="muted">
        {message}
      </Text>
      {onRetry ? (
        <Button
          label={retryLabel}
          variant="secondary"
          fullWidth={false}
          className="self-start"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}
