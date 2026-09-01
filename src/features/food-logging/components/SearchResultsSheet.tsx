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
  /** Where the sheet's top edge sits — the bottom of the search field. */
  topInset?: number;
}

/**
 * Search results live in a sheet so the home screen stays a log surface — it
 * hangs off the bottom of the search field and fills the rest of the screen,
 * scrolling its infinite-scroll pages (limit 10) inside that frame, with a
 * describe-meal escape hatch at the end.
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
  topInset,
}: SearchResultsSheetProps) {
  // The escape hatch is pinned under the list rather than scrolling with it, so
  // it is reachable without paging to the end of the results.
  const showDescribeEscape =
    canSearch && !isLoading && !isError && (items.length > 0 || !isFetchingNextPage);

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title="Search results"
      closeLabel="Close search results"
      topInset={topInset}
      subtitle={
        <Text variant="caption" color="muted" numberOfLines={2}>
          {`Showing results for "${query.trim()}"`}
        </Text>
      }
    >
      <BottomSheetScrollView
        style={topInset === undefined ? { maxHeight: 420 } : { flex: 1 }}
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
      </BottomSheetScrollView>

      {showDescribeEscape ? (
        <View className="items-center gap-xs">
          <Text variant="caption" color="muted">
            {"Don't see it?"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onDescribe}
            className="min-h-touchTarget justify-center"
          >
            <Text variant="body" color="primary" className="font-semibold">
              Describe the meal instead
            </Text>
          </Pressable>
        </View>
      ) : null}
    </BottomSheetShell>
  );
}
