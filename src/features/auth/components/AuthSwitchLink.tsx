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
      className="min-h-touchTarget items-center justify-center"
      // Pull up by the leading the 48pt touch target adds above the label, so
      // the text lands on the Figma baseline rather than the hit area doing.
      style={{ marginTop: -6 }}
    >
      <Text variant="body" color="dark" className="text-center">
        {prompt}{" "}
        <Text variant="body" color="accent" className="font-semibold">
          {actionLabel}
        </Text>
      </Text>
    </Pressable>
  );
}
