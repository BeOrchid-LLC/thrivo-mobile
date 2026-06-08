import { View, Text } from "react-native";
import { colors, spacing, typography } from "@/theme";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.white,
      }}
    >
      <Text style={[typography.heading1, { color: colors.dark, marginBottom: spacing.md }]}>
        Thrivo
      </Text>
      <Text style={[typography.body, { color: colors.gray[600] }]}>
        Weight loss that actually works.
      </Text>
    </View>
  );
}
