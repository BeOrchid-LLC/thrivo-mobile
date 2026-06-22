import { View } from "react-native";
import { Text } from "@/components";

interface InsightPillProps {
  children: string;
}

/**
 * Green-tinted insight row with a leading dot (Figma onboarding "insight" — node
 * 20:212). Used to surface a computed summary under the inputs. Tokens only.
 */
export function InsightPill({ children }: InsightPillProps) {
  return (
    <View className="flex-row items-center gap-[10px] rounded-[12px] border-[0.667px] border-primaryBright/[0.12] bg-primaryBright/[0.08] px-lg py-md">
      <View className="h-[7px] w-[7px] rounded-pill bg-primary" />
      <Text className="flex-1 font-medium text-[14px] leading-[21px] text-primary">{children}</Text>
    </View>
  );
}
