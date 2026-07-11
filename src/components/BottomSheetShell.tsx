import { useContext } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface BottomSheetShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Rendered directly under the title, inside the same header column (e.g. a calorie caption). */
  subtitle?: ReactNode;
  /** Accessible label for the backdrop tap-to-close control. Defaults to `Close ${title}`. */
  closeLabel?: string;
  /** Rendered in the header row, before the close button (e.g. a favorite toggle). */
  headerAccessory?: ReactNode;
  children: ReactNode;
  /**
   * Rendered as a sibling of the dimmed backdrop, inside the same Modal but
   * outside the sheet card — for native overlays (e.g. a spinner
   * DateTimePicker) that must not nest inside the card's layout flow.
   */
  modalOverlay?: ReactNode;
}

/**
 * R6 (I22): the Modal/backdrop/insets/grab-handle/header scaffold that
 * EditFoodLogSheet and LogItemSheet each hand-rolled identically, extracted
 * to one place (pattern taken from `select-sheet.tsx`, which stays as-is —
 * it's a different, already-single-instance component).
 */
export function BottomSheetShell({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  headerAccessory,
  children,
  modalOverlay,
}: BottomSheetShellProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel ?? `Close ${title}`}
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          className="gap-md rounded-t-[24px] bg-white px-lg pt-md"
          style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        >
          <View className="h-[4px] w-[44px] self-center rounded-pill bg-gray-300" />
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-semibold text-[18px]" numberOfLines={1}>
                {title}
              </Text>
              {subtitle}
            </View>
            <View className="flex-row items-center gap-md">
              {headerAccessory}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={onClose}
                className="h-[36px] w-[36px] items-center justify-center rounded-full bg-light"
              >
                <X size={18} color={colors.gray[500]} />
              </Pressable>
            </View>
          </View>
          {children}
        </View>
      </View>
      {modalOverlay}
    </Modal>
  );
}
