import {
  ActivityIndicator,
  Image,
  Pressable,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { colors } from "@/theme";
import { Text } from "@/components/Text";

interface FigmaAuthRowProps extends Omit<PressableProps, "children" | "style"> {
  icon?: ImageSourcePropType;
  iconElement?: ReactNode;
  iconSize?: number;
  label: string;
  loading?: boolean;
  style?: ViewStyle;
}

export function FigmaAuthRow({
  icon,
  iconElement,
  iconSize = 22,
  label,
  loading = false,
  disabled,
  style,
  ...rest
}: FigmaAuthRowProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      // Figma-exact dimensions/border for the auth row; arbitrary values keep
      // them in the className system. borderCurve is iOS-only and has no class.
      className={`h-[60px] w-full max-w-[342px] items-center justify-center rounded-[16px] border-[1.333px] border-hairline bg-white active:opacity-[0.86] ${
        isDisabled ? "opacity-50" : ""
      }`}
      style={[{ borderCurve: "continuous" }, style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View className="flex-row items-center justify-center gap-sm">
          {iconElement ??
            (icon ? (
              <Image
                source={icon}
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                style={{ width: iconSize, height: iconSize }}
              />
            ) : null)}
          <Text variant="body" color="dark" className="text-center font-medium">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
