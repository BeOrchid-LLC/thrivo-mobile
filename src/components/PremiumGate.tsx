import { BlurView } from "expo-blur";
import { Lock } from "phosphor-react-native";
import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";
import { Button } from "./Button";
import { Text } from "./Text";

export interface PremiumGateProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  onViewPlans: () => void;
}

/** Blurred premium content with the standard in-context upgrade prompt. */
export function PremiumGate({ children, title, subtitle, onViewPlans }: PremiumGateProps) {
  return (
    <View className="overflow-hidden rounded-lg">
      {children}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <BlurView
          pointerEvents="none"
          tint="light"
          intensity={18}
          style={StyleSheet.absoluteFillObject}
        />
        <View className="absolute inset-0 my-5 items-center justify-center px-sm">
          <View className="w-full max-w-[320px] items-center gap-sm rounded-[16px] bg-gray-100 px-lg py-lg">
            <Lock size={24} color={colors.gray[600]} weight="regular" />
            <Text variant="heading3" color="dark" className="text-center">
              {title}
            </Text>
            <Text variant="body" color="muted" className="text-center">
              {subtitle}
            </Text>
            <Button label="View plans" onPress={onViewPlans} className="mt-xs" />
          </View>
        </View>
      </View>
    </View>
  );
}
