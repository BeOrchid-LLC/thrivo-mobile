import { View } from "react-native";
import { SkeletonBlock, SkeletonText } from "@/components";

export function FoodRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-sm">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className="flex-row items-center justify-between border-b border-gray-200 py-sm"
        >
          <View className="flex-1 gap-xs">
            <SkeletonText className="w-2/3" />
            <SkeletonText size="caption" className="w-1/3" />
          </View>
          <SkeletonBlock className="h-[24px] w-[24px] rounded-pill" />
        </View>
      ))}
    </View>
  );
}
