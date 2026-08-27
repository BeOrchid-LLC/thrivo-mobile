import {
  ActivityIndicator,
  Image,
  Pressable,
  View,
  type ImageSourcePropType,
  type PressableProps,
} from "react-native";
import { Text } from "@/components";
import { colors } from "@/theme";

export interface AuthProviderButtonProps extends Omit<PressableProps, "children"> {
  icon: ImageSourcePropType;
  iconSize?: number;
  label: string;
  loading?: boolean;
}

/**
 * Outlined SSO row used under the "OR" divider on the sign-in screen: green
 * border on the page gradient, so it reads as secondary to the primary action
 * above it without introducing a second filled button.
 */
export function AuthProviderButton({
  icon,
  iconSize = 22,
  label,
  loading = false,
  disabled,
  ...rest
}: AuthProviderButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      className={`h-[52px] flex-row items-center justify-center gap-sm rounded-group border border-primary bg-transparent px-lg active:opacity-[0.85] ${
        isDisabled ? "opacity-50" : ""
      }`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View className="flex-row items-center justify-center gap-sm">
          <Image
            source={icon}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: iconSize, height: iconSize }}
          />
          <Text variant="body" color="dark" className="font-semibold">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
