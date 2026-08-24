import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, rhythm, spacing } from "@/theme";

/**
 * Named page rhythms. Screens pick one instead of writing `gap`/`padding`
 * literals — which is how the app ended up with four different page gaps.
 *
 * `tabbed` exists because tab-bar clearance is a different concern from bottom
 * padding that happens to look the same in a style object.
 */
export type ScreenRhythm = "default" | "form" | "tabbed";

const RHYTHMS: Record<ScreenRhythm, ViewStyle> = {
  default: {
    gap: rhythm.pageGap,
    paddingTop: rhythm.pageTop,
    paddingBottom: rhythm.pageBottom,
  },
  form: {
    gap: rhythm.pageGap,
    paddingTop: rhythm.pageTop,
    paddingBottom: rhythm.pageBottomRoomy,
  },
  tabbed: {
    gap: rhythm.pageGap,
    paddingTop: rhythm.pageTop,
    paddingBottom: rhythm.tabBarClearance,
  },
};

export interface ScreenProps {
  children: ReactNode;
  /** Fixed content above the scroll/body area, usually a PageHeader. */
  header?: ReactNode;
  /**
   * Fixed content below the scroll/body area, usually primary actions.
   *
   * Sits `spacing.lg` (16) clear of the bottom, above the safe-area inset — the
   * same gap on every screen, so a primary button never lands in a different
   * place depending on which page you are on.
   */
  footer?: ReactNode;
  /** Wrap content in a ScrollView (default false for fixed layouts). */
  scroll?: boolean;
  /** Safe-area edges to apply. Defaults to all. */
  edges?: readonly Edge[];
  /** Apply default horizontal+vertical padding (default true). */
  padded?: boolean;
  /** Named page rhythm. `style` still wins, for the genuine one-offs. */
  rhythm?: ScreenRhythm;
  style?: ViewStyle;
  backgroundColor?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshControlProps?: Partial<RefreshControlProps>;
}

/**
 * Base screen container: safe-area aware + themed background. Every screen
 * renders inside a Screen so status-bar insets are never hardcoded
 * (MOBILE_ARCHITECTURE §7). SafeAreaView is a third-party wrapper, so its
 * background (a runtime prop) stays a token-sourced style.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = false,
  edges = ["top", "bottom", "left", "right"],
  padded = true,
  rhythm: rhythmName,
  style,
  backgroundColor = colors.white,
  refreshing,
  onRefresh,
  refreshControlProps,
}: ScreenProps) {
  const padding: ViewStyle | undefined = padded
    ? { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }
    : undefined;
  // Order matters: the rhythm overrides `padded`'s vertical default, and an
  // explicit `style` still overrides the rhythm.
  const rhythmStyle = rhythmName ? RHYTHMS[rhythmName] : undefined;
  const chromeHorizontalPadding = padded ? spacing.lg : 0;
  // A pinned header owns the page's top spacing, so it inherits whatever the
  // rhythm (or an explicit style) asked for and the scrolling content starts at
  // zero. Without this the two stack and every headed screen gains a dead band
  // under its title.
  const chromeTopPadding =
    (rhythmStyle?.paddingTop as number | undefined) ??
    (style?.paddingTop as number | undefined) ??
    spacing.lg;
  const contentStyle: (ViewStyle | undefined)[] = [
    padding,
    rhythmStyle,
    header ? { paddingTop: 0 } : undefined,
    style,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {header ? (
        <View
          style={{
            backgroundColor,
            paddingHorizontal: chromeHorizontalPadding,
            paddingTop: chromeTopPadding,
            // The page gap, so a pinned header sits the same distance from the
            // first content row as any two rows sit from each other.
            paddingBottom: rhythm.pageGap,
          }}
        >
          {header}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                {...refreshControlProps}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1" style={contentStyle}>
          {children}
        </View>
      )}
      {footer ? (
        <View
          style={{
            backgroundColor,
            paddingHorizontal: chromeHorizontalPadding,
            paddingTop: spacing.sm,
            paddingBottom: spacing.lg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
