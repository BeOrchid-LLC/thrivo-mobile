import { useCallback, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
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
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };

  useEffect(() => {
    if (visible) sheetRef.current?.present();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.3}
        pressBehavior="close"
        accessibilityLabel={closeLabel ?? `Close ${title}`}
      />
    ),
    [closeLabel, title]
  );

  const handleDismiss = useCallback(() => {
    if (visible) onClose();
  }, [onClose, visible]);

  if (!visible) return modalOverlay ? <>{modalOverlay}</> : null;

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          width: 44,
          backgroundColor: colors.gray[300],
        }}
        onDismiss={handleDismiss}
      >
        <BottomSheetView
          className="gap-md px-lg pt-xs"
          style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-semibold text-[18px]" numberOfLines={1}>
                {title}
              </Text>
              {subtitle}
            </View>
            {headerAccessory ? (
              <View className="flex-row items-center gap-md">{headerAccessory}</View>
            ) : null}
          </View>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
      {modalOverlay}
    </>
  );
}
