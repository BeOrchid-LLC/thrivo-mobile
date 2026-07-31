import { Pressable } from "react-native";
import { Heart } from "phosphor-react-native";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import { useToggleFavorite } from "../hooks/useFoodLogging";

export interface FavoriteButtonProps {
  foodItemId: string;
  size?: number;
  hitSlop?: number;
}

/** Consistent favorite toggle used by food rows and food detail headers. */
export function FavoriteButton({ foodItemId, size = 20, hitSlop = 8 }: FavoriteButtonProps) {
  const toggleFavorite = useToggleFavorite();
  const isFavorite = useIsFavorite(foodItemId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
      accessibilityState={{ selected: isFavorite }}
      onPress={(event) => {
        event?.stopPropagation?.();
        toggleFavorite(foodItemId);
      }}
      hitSlop={hitSlop}
    >
      <Heart size={size} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
    </Pressable>
  );
}
