import { MagnifyingGlass, X } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { colors } from "@/theme";
import { Input } from "./Input";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search…" }: SearchBarProps) {
  return (
    <View className="relative">
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        leadingIcon={<MagnifyingGlass size={18} color={colors.gray[400]} />}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText("")}
          hitSlop={8}
          className="absolute bottom-0 right-lg top-0 justify-center"
        >
          <X size={16} color={colors.gray[500]} />
        </Pressable>
      ) : null}
    </View>
  );
}
