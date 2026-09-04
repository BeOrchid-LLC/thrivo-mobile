import { useCountUp, type CountUpOptions } from "@/hooks/useCountUp";
import { formatNumber } from "@/utils";
import { Text, type TextProps } from "./Text";

export interface AnimatedNumberProps extends Omit<TextProps, "children">, CountUpOptions {
  value: number;
  /** Rendered around the counting value, e.g. `(n) => `${formatNumber(n)} kcal``. */
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
  format = formatNumber,
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
