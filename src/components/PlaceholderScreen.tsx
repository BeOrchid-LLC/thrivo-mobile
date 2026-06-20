import { View } from "react-native";
import { Screen } from "./Screen";
import { Text } from "./Text";

export interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  /** Marks screens whose content is premium-gated within the (app) group. */
  premium?: boolean;
}

/**
 * Temporary route scaffold. Each route group renders these until the real
 * feature screens land under src/features. Keeps the navigation tree complete
 * and navigable during setup.
 */
export function PlaceholderScreen({ title, subtitle, premium }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="heading2" color="dark" className="mb-sm">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="muted" className="mb-md text-center">
            {subtitle}
          </Text>
        ) : null}
        {premium ? (
          <Text variant="caption" color="primary">
            Premium
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
