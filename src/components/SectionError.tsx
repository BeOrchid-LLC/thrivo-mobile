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

/**
 * Section errors are switched off product-wide. Screens stacked several "Could
 * not load X" cards down a page whose remaining content was perfectly usable,
 * which read as the app being broken rather than one query being slow. Recovery
 * is pull-to-refresh and the query layer's own retry instead.
 *
 * The switch lives here rather than at the ~20 call sites so the branches stay
 * in place: no screen has to relearn which of its sections can fail, and turning
 * the cards back on is this one line.
 */
const SHOW_SECTION_ERRORS: boolean = false;

/** Compact, local error state for one section without blocking the full screen. */
export function SectionError({
  title,
  message = "Please try again.",
  onRetry,
  retryLabel = "Retry",
  className,
}: SectionErrorProps) {
  if (!SHOW_SECTION_ERRORS) return null;

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
