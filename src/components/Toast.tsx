import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, View } from "react-native";
import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { Text } from "./Text";

type ToastVariant = "success" | "error";

interface ToastState {
  message: string;
  variant: ToastVariant;
}

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };

  const clearToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ message, variant = "success", durationMs = 2500 }: ToastOptions) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ message, variant });
      timeoutRef.current = setTimeout(clearToast, durationMs);
    },
    [clearToast]
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const isError = toast?.variant === "error";

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 items-center px-lg"
          style={{ bottom: Math.max(insets.bottom + 84, 100) }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={clearToast}
            className={`max-w-[340px] flex-row items-center gap-sm rounded-lg border px-md py-sm shadow ${
              isError ? "border-error bg-white" : "border-primarySoft bg-white"
            }`}
          >
            {isError ? (
              <WarningCircle size={20} color={colors.error} weight="fill" />
            ) : (
              <CheckCircle size={20} color={colors.primary} weight="fill" />
            )}
            <Text variant="body" color={isError ? "error" : "dark"} className="flex-1">
              {toast.message}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
