import { View } from "react-native";
import { SkeletonText } from "./Skeleton";

export interface HistorySkeletonProps {
  rows?: number;
}

/** Shared loading shape for grouped history lists. */
export function HistorySkeleton({ rows = 3 }: HistorySkeletonProps) {
  return (
    <View className="gap-lg">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} className="gap-md">
          <SkeletonText size="heading" className="w-1/3" />
          <View className="gap-sm">
            <SkeletonText className="w-2/3" />
            <SkeletonText size="caption" className="w-1/4" />
          </View>
        </View>
      ))}
    </View>
  );
}
