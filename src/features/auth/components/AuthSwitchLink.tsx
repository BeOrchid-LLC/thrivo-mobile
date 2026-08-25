import { Pressable } from "react-native";
import { Text } from "@/components";

export interface AuthSwitchLinkProps {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
}

/** Shared footer link for switching between sign-up and sign-in flows. */
export function AuthSwitchLink({ prompt, actionLabel, onPress }: AuthSwitchLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mt-sm min-h-touchTarget items-center justify-center"
    >
      <Text variant="caption" color="muted">
        {prompt} <Text color="primary">{actionLabel}</Text>
      </Text>
    </Pressable>
  );
}
