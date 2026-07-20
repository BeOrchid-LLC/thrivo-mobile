import { ActivityIndicator, Pressable, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheetShell, SectionError, Text } from "@/components";
import { colors } from "@/theme";
import type { FoodItem } from "@/contracts";
import { FoodResultRow } from "./FoodResultRow";
import { FoodRowSkeleton } from "./FoodRowSkeleton";

export interface SearchResultsSheetProps {
  query: string;
  visible: boolean;
  onClose: () => void;
  items: FoodItem[];
  canSearch: boolean;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onRetry: () => void;
  onFetchNextPage: () => void;
  onSelect: (item: FoodItem) => void;
  onDescribe: () => void;
  logging?: boolean;
}

/**
 * Search results live in a sheet so the home screen stays a log surface —
 * infinite scroll pages (limit 10) with a describe-meal escape hatch.
 */
export function SearchResultsSheet({
  query,
  visible,
  onClose,
  items,
  canSearch,
  isLoading,
  isError,
  isFetchingNextPage,
  hasNextPage,
  onRetry,
  onFetchNextPage,
  onSelect,
  onDescribe,
  logging = false,
}: SearchResultsSheetProps) {
  const showEmpty =
    canSearch && !isLoading && !isError && items.length === 0 && !isFetchingNextPage;

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title="Search results"
      closeLabel="Close search results"
      subtitle={
        <Text variant="caption" color="muted" numberOfLines={2}>
          {`Showing results for "${query.trim()}"`}
        </Text>
      }
    >
      <BottomSheetScrollView
        style={{ maxHeight: 420 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 48;
          if (nearBottom && hasNextPage && !isFetchingNextPage) onFetchNextPage();
        }}
      >
        {!canSearch ? (
          <Text variant="caption" color="muted">
            Type at least 2 characters to search.
          </Text>
        ) : null}

        {canSearch && isLoading ? <FoodRowSkeleton count={4} /> : null}

        {isError ? (
          <SectionError
            title="Could not search foods"
            message="Check your connection and try again."
            onRetry={onRetry}
            className="border-0 p-0"
          />
        ) : null}

        {items.map((item) => (
          <FoodResultRow key={item.id} item={item} onLog={() => onSelect(item)} loading={logging} />
        ))}

        {isFetchingNextPage ? (
          <View className="items-center py-md">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {showEmpty ? (
          <View className="items-center gap-xs py-md">
            <Text variant="caption" color="muted">
              {"Don't see it?"}
            </Text>
            <Pressable accessibilityRole="button" onPress={onDescribe}>
              <Text variant="body" color="primary" className="font-semibold">
                Describe the meal instead
              </Text>
            </Pressable>
          </View>
        ) : null}

        {canSearch && !isLoading && !isError && items.length > 0 ? (
          <View className="items-center gap-xs py-sm">
            <Text variant="caption" color="muted">
              {"Don't see it?"}
            </Text>
            <Pressable accessibilityRole="button" onPress={onDescribe}>
              <Text variant="body" color="primary" className="font-semibold">
                Describe the meal instead
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetShell>
  );
}
