import type { ReactNode } from "react";
import { KeyboardAvoidingView, type ViewStyle } from "react-native";

export interface KeyboardAvoiderProps {
  children: ReactNode;
  /** Turn the lift off for a screen that has no fields (default true). */
  enabled?: boolean;
  /**
   * Extra distance to keep clear of the keyboard, for chrome that sits below
   * this view (a tab bar the page does not own, say).
   */
  offset?: number;
  style?: ViewStyle;
}

/**
 * Lifts a page above the software keyboard, so a pinned footer — and the rest
 * of the page under a focused field — stays reachable instead of being sealed
 * off behind the keyboard.
 *
 * `padding` on both platforms, deliberately. Android used to resize its own
 * window (`softwareKeyboardLayoutMode: "resize"`), which is why this was once an
 * iOS-only measure, but under edge-to-edge the window is no longer inset for the
 * keyboard and nothing lifts on its own. The lift is safe on the older devices
 * that still resize: RN measures the gap between this view's own bottom edge and
 * the top of the keyboard, so on a window that already shrank the gap — and the
 * padding — is zero.
 */
export function KeyboardAvoider({
  children,
  enabled = true,
  offset = 0,
  style,
}: KeyboardAvoiderProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="padding"
      keyboardVerticalOffset={offset}
      enabled={enabled}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
