import type { ReactNode } from "react";
import { Modal, View } from "react-native";
import { Check, X } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface CenterModalProps {
  visible: boolean;
  /** Picks the badge icon and its tint: a destructive confirm, or a done state. */
  tone: "danger" | "success";
  title: string;
  body: string;
  /** The action buttons, stacked under the copy. */
  children: ReactNode;
  /**
   * Android hardware back. Left undefined a dialog is un-dismissable, which is
   * what a confirm wants; an acknowledge-only alert should pass its dismiss.
   */
  onRequestClose?: () => void;
}

/**
 * Centred confirmation dialog — a circular tone badge, a title, one paragraph of
 * copy, and stacked actions on a dimmed backdrop. The counterpart to
 * `BottomSheetShell`: sheets are for picking, this is for confirming.
 *
 * It has no dismiss affordance of its own on purpose — every action it carries
 * is a decision, so the caller's buttons are the only way out.
 */
export function CenterModal({
  visible,
  tone,
  title,
  body,
  children,
  onRequestClose,
}: CenterModalProps) {
  const isSuccess = tone === "success";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View className="flex-1 items-center justify-center bg-black/30 px-xl">
        <View className="w-full gap-lg rounded-lg bg-white p-xl">
          <View
            className={`h-badgeLg w-badgeLg items-center justify-center self-center rounded-full ${
              isSuccess ? "bg-primarySoft" : "bg-red-100"
            }`}
          >
            {isSuccess ? (
              <Check size={26} color={colors.primaryBright} />
            ) : (
              <X size={26} color={colors.error} />
            )}
          </View>
          <Text variant="body-lg" className="text-center font-semibold">
            {title}
          </Text>
          <Text variant="body" color="dark" className="text-center">
            {body}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}
