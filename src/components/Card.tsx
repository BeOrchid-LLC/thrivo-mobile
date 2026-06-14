import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme";

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

/** Themed surface container with consistent radius, padding and subtle elevation. */
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray[200],
  },
});
