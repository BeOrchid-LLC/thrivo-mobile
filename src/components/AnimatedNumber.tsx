import { useCountUp, type CountUpOptions } from "@/hooks/useCountUp";
import { Text, type TextProps } from "./Text";

export interface AnimatedNumberProps extends Omit<TextProps, "children">, CountUpOptions {
  value: number;
  /** Rendered around the counting value, e.g. `(n) => `${n.toLocaleString()} kcal``. */
  format?: (value: number) => string;
}

/**
 * A `Text` whose number counts up from zero the first time it lands.
 *
 * `accessibilityLabel` carries the *final* value so screen readers announce the
 * real number once rather than narrating every intermediate frame.
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  duration,
  decimals,
  enabled,
  ...textProps
}: AnimatedNumberProps) {
  const display = useCountUp(value, { duration, decimals, enabled });

  return (
    <Text {...textProps} accessibilityLabel={textProps.accessibilityLabel ?? format(value)}>
      {format(display)}
    </Text>
  );
}
