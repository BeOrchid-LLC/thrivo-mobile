import { Text } from "./Text";

export interface FormErrorProps {
  /** The message to show; renders nothing when null/undefined. */
  message?: string | null;
  /** Center the text (auth screens) vs. left-align (inline field errors). */
  center?: boolean;
}

/**
 * Inline, caption-sized error message — the shared surface for form/auth errors
 * where a full `SectionError`/`ErrorState` card would be too heavy (e.g. a failed
 * "send code"). Keeps every inline error styled identically instead of repeating
 * raw `<Text color="error">` at each call site.
 */
export function FormError({ message, center = false }: FormErrorProps) {
  if (!message) return null;
  return (
    <Text variant="caption" color="error" selectable className={center ? "text-center" : undefined}>
      {message}
    </Text>
  );
}
