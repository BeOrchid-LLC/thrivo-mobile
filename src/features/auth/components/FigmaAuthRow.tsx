import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { colors } from "@/theme";

interface FigmaAuthRowProps extends Omit<PressableProps, "children" | "style"> {
  icon: ImageSourcePropType;
  iconSize?: number;
  label: string;
  loading?: boolean;
  style?: ViewStyle;
}

export function FigmaAuthRow({
  icon,
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
      className={`h-[60px] w-full max-w-[342px] items-center justify-center rounded-[16px] border-[1.333px] border-[#D8D8D8] bg-white active:opacity-[0.86] ${
        isDisabled ? "opacity-50" : ""
      }`}
      style={[{ borderCurve: "continuous" }, style]}
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
          <Text className="text-center font-medium text-[16px] leading-[24px] text-dark">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
