import { router } from "expo-router";
import { View } from "react-native";
import { Button, Screen, Text } from "@/components";

export default function Settings() {
  return (
    <Screen>
      <View className="flex-1 gap-lg pt-lg">
        <Text variant="heading2" color="dark">
          Settings
        </Text>
        <Button
          label="Manage subscription"
          variant="secondary"
          onPress={() => router.push("/(app)/settings/subscription")}
        />
      </View>
    </Screen>
  );
}
