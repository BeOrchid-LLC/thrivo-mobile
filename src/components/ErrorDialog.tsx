import { useRef } from "react";
import { Button } from "./Button";
import { CenterModal } from "./CenterModal";

export interface ErrorDialogProps {
  /** The failure to report. The dialog is open whenever this is non-null. */
  message: string | null;
  /** Headline above the message — say what failed, not that something did. */
  title?: string;
  onDismiss: () => void;
  actionLabel?: string;
}

/**
 * The one way to surface an error the user has to acknowledge: a centred modal
 * with a single OK button, identical on iOS and Android.
 *
 * Prefer this over an inline banner for anything the user must notice — a
 * banner pinned above the header competes with the screen chrome and is easy to
 * scroll past. Inline validation (`FormError`) and section-level retries
 * (`SectionError`) stay where they are; those belong next to their field.
 */
export function ErrorDialog({
  message,
  title = "Something went wrong",
  onDismiss,
  actionLabel = "OK",
}: ErrorDialogProps) {
  // Hold the last message so the copy does not blank out mid fade-out.
  const lastMessage = useRef("");
  if (message) lastMessage.current = message;

  return (
    <CenterModal
      visible={message !== null}
      onRequestClose={onDismiss}
      tone="danger"
      title={title}
      body={message ?? lastMessage.current}
    >
      <Button label={actionLabel} onPress={onDismiss} />
    </CenterModal>
  );
}
