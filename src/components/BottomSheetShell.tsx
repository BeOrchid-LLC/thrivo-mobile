import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";
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
   * Distance from the top of the window the sheet stops at. Set it and the
   * sheet fills everything below that line instead of sizing to its content —
   * for sheets that should hang off a specific element on the page (the search
   * results start under the search field) and scroll inside that frame.
   */
  topInset?: number;
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
  topInset,
  modalOverlay,
}: BottomSheetShellProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const contentRef = useRef({ title, subtitle, headerAccessory, children });
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const fixedHeight = topInset !== undefined;
  // "100%" of the space left under `topInset`, so the card spans from that line
  // to the bottom of the screen.
  const snapPoints = useMemo(() => ["100%"], []);
  // Dismissing a sheet and unmounting it are not the same thing: the modal
  // lives in a portal it only tears down as part of its own dismissal, so
  // dropping it from the tree while it is still presented strands the card on
  // screen over whatever comes next — which is what closing the search sheet by
  // navigating to another screen used to do. Stay mounted through the closing
  // animation and let `onDismiss` retire the node.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [mounted, visible]);

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
    setMounted(false);
    if (visible) onClose();
  }, [onClose, visible]);

  // Callers usually drop the sheet's data in the same breath as they hide it
  // (`setEditingEntry(null)`, clearing the query), so the last visible content
  // is held here and shown while the card slides away — otherwise the sheet
  // empties out in front of the user on its way down.
  if (visible) contentRef.current = { title, subtitle, headerAccessory, children };
  const content = visible ? { title, subtitle, headerAccessory, children } : contentRef.current;

  if (!mounted) return modalOverlay ? <>{modalOverlay}</> : null;

  const header = (
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Text variant="body-lg" className="font-semibold" numberOfLines={1}>
          {content.title}
        </Text>
        {content.subtitle}
      </View>
      {content.headerAccessory ? (
        <View className="flex-row items-center gap-md">{content.headerAccessory}</View>
      ) : null}
    </View>
  );

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing={!fixedHeight}
        snapPoints={fixedHeight ? snapPoints : undefined}
        topInset={topInset}
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
        {fixedHeight ? (
          // A plain View, not BottomSheetView: BottomSheetView claims the
          // sheet's scrollable slot on mount, and because parent effects run
          // last it overwrites the registration of any BottomSheetScrollView
          // nested inside it — leaving the sheet convinced its content does not
          // scroll, so a long list drags the sheet instead of scrolling. The
          // sheet's content container is already a fixed height here, so
          // `flex-1` fills it without help.
          <View
            className="flex-1 gap-md px-lg pt-xs"
            style={{ paddingBottom: insets.bottom + spacing.lg }}
          >
            {header}
            {content.children}
          </View>
        ) : (
          <BottomSheetView
            className="gap-md px-lg pt-xs"
            style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
          >
            {header}
            {content.children}
          </BottomSheetView>
        )}
      </BottomSheetModal>
      {modalOverlay}
    </>
  );
}
