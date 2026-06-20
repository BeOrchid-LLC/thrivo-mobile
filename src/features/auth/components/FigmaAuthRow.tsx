import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
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
      style={({ pressed }) => [
        styles.row,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.content}>
          <Image
            source={icon}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: iconSize, height: iconSize }}
          />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    maxWidth: 342,
    height: 60,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1.333,
    borderColor: "#D8D8D8",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: colors.dark,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.5 },
});
