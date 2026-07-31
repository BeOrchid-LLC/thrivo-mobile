import { useContext } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Check, LockSimple, X } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface SelectSheetOption<T extends string | number> {
  label: string;
  value: T;
  locked?: boolean;
  accessory?: ReactNode;
}

export interface SelectSheetProps<T extends string | number> {
  title: string;
  options: readonly SelectSheetOption<T>[];
  value: T;
  visible: boolean;
  onChange: (value: T) => void;
  onLockedPress?: (option: SelectSheetOption<T>) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function SelectSheet<T extends string | number>({
  title,
  options,
  value,
  visible,
  onChange,
  onLockedPress,
  onClose,
  disabled = false,
}: SelectSheetProps<T>) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const select = (option: SelectSheetOption<T>) => {
    if (disabled) return;
    if (option.locked) {
      onClose();
      onLockedPress?.(option);
      return;
    }
    onChange(option.value);
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
        <View
          className="gap-md rounded-t-[24px] bg-white px-lg pt-md"
          style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        >
          <View className="h-[4px] w-[44px] self-center rounded-pill bg-gray-300" />
          <View className="flex-row items-center justify-between">
            <Text variant="body-lg" className="font-semibold">
              {title}
            </Text>
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
                  accessibilityLabel={
                    option.locked ? `${option.label}, premium required` : option.label
                  }
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => select(option)}
                  className={`min-h-[54px] flex-row items-center justify-between px-lg py-md ${
                    selected ? "bg-primarySoft" : "bg-white"
                  } ${divider}`}
                >
                  <Text
                    variant="body"
                    color={option.locked ? "gray600" : "dark"}
                    className={selected ? "font-semibold" : "font-regular"}
                  >
                    {option.label}
                  </Text>
                  {option.accessory ??
                    (option.locked ? (
                      <LockSimple size={19} color={colors.gray[500]} />
                    ) : selected ? (
                      <Check size={20} color={colors.primaryBright} />
                    ) : null)}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
