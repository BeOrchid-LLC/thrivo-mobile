import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export interface CardProps extends ViewProps {
  children: ReactNode;
}

/** Themed surface container with consistent radius, padding and a hairline border. */
export function Card({ children, className, style, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-lg border-gray-200 bg-white p-lg ${className ?? ""}`}
      // Hairline is sub-pixel and not expressible as a Tailwind border width.
      style={[{ borderWidth: StyleSheet.hairlineWidth }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
