import { createContext, useCallback, useContext, type ReactNode } from "react";
import { View } from "react-native";
import ToastMessage, {
  BaseToast,
  type BaseToastProps,
  type ToastConfig,
} from "react-native-toast-message";
import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { typography } from "@/theme/typography";

type ToastVariant = "success" | "error";

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

const iconContainerClassName = "h-full justify-center pl-md";

function AppToast({
  variant,
  ...props
}: BaseToastProps & {
  variant: ToastVariant;
}) {
  const isError = variant === "error";

  return (
    <BaseToast
      {...props}
      activeOpacity={0.92}
      style={{
        width: "92%",
        maxWidth: 340,
        minHeight: 52,
        borderLeftWidth: 0,
        borderWidth: 1,
        borderColor: isError ? colors.error : colors.primarySoft,
        borderRadius: 16,
        backgroundColor: colors.white,
        shadowColor: colors.dark,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
      text1NumberOfLines={2}
      text1Style={{
        color: isError ? colors.error : colors.dark,
        fontFamily: "Inter_500Medium",
        fontSize: typography.caption.fontSize,
        lineHeight: typography.caption.lineHeight,
      }}
      renderLeadingIcon={() => (
        <View className={iconContainerClassName}>
          {isError ? (
            <WarningCircle size={20} color={colors.error} weight="fill" />
          ) : (
            <CheckCircle size={20} color={colors.primary} weight="fill" />
          )}
        </View>
      )}
    />
  );
}

const toastConfig: ToastConfig = {
  success: (props) => <AppToast {...props} variant="success" />,
  error: (props) => <AppToast {...props} variant="error" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  const showToast = useCallback(
    ({ message, variant = "success", durationMs = 2500 }: ToastOptions) => {
      ToastMessage.show({
        type: variant,
        text1: message,
        position: "top",
        visibilityTime: durationMs,
        autoHide: true,
        topOffset: Math.max(insets.top + 20, 100),
      });
    },
    [insets.top]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastMessage
        config={toastConfig}
        position="top"
        topOffset={Math.max(insets.top, 20)}
        visibilityTime={2500}
        swipeable
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
