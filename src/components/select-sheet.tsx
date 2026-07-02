import { Modal, Pressable, View } from "react-native";
import { Check, X } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface SelectSheetOption<T extends string | number> {
  label: string;
  value: T;
}

export interface SelectSheetProps<T extends string | number> {
  title: string;
  options: readonly SelectSheetOption<T>[];
  value: T;
  visible: boolean;
  onChange: (value: T) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function SelectSheet<T extends string | number>({
  title,
  options,
  value,
  visible,
  onChange,
  onClose,
  disabled = false,
}: SelectSheetProps<T>) {
  const select = (nextValue: T) => {
    if (disabled) return;
    onChange(nextValue);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          className="absolute inset-0"
          onPress={onClose}
        />
        <View className="gap-md rounded-t-[24px] bg-white px-lg pb-xl pt-md">
          <View className="h-[4px] w-[44px] self-center rounded-pill bg-gray-300" />
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-[18px]">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${title}`}
              hitSlop={10}
              onPress={onClose}
              className="h-[36px] w-[36px] items-center justify-center rounded-full bg-light"
            >
              <X size={18} color={colors.gray[500]} />
            </Pressable>
          </View>
          <View className="overflow-hidden rounded-[14px] border border-gray-200">
            {options.map((option, index) => {
              const selected = option.value === value;
              const divider = index < options.length - 1 ? "border-b border-gray-100" : "";

              return (
                <Pressable
                  key={String(option.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => select(option.value)}
                  className={`min-h-[54px] flex-row items-center justify-between px-lg py-md ${
                    selected ? "bg-primarySoft" : "bg-white"
                  } ${divider}`}
                >
                  <Text className={`text-[16px] ${selected ? "font-semibold" : "font-regular"}`}>
                    {option.label}
                  </Text>
                  {selected ? <Check size={20} color={colors.primaryBright} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
