import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform, TextInput, View } from "react-native";
import { BackButton, Button, Screen, Text } from "@/components";
import { colors } from "@/theme";
import { useRequestOtp, useVerifyOtp } from "../hooks/useAuth";

type OtpParams = {
  email?: string;
  source?: "email" | "sign-in";
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function notify(type: "success" | "error") {
  if (Platform.OS !== "ios") return;
  void Haptics.notificationAsync(
    type === "success"
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error
  );
}

export function OtpVerifyScreen() {
  const { email, source } = useLocalSearchParams<OtpParams>();
  const verify = useVerifyOtp();
  const request = useRequestOtp();
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const submittedCode = useRef<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);
  const normalizedEmail = typeof email === "string" ? email : "";
  const boxes = useMemo(() => Array.from({ length: 6 }, (_, index) => code[index] ?? ""), [code]);
  const differentEmailTarget = source === "sign-in" ? "/(auth)/sign-in" : "/(auth)/email";

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!normalizedEmail) router.replace("/(auth)/email");
  }, [normalizedEmail]);

  useEffect(() => {
    if (code.length !== 6 || verify.isPending || submittedCode.current === code) return;
    submittedCode.current = code;
    verify.mutate(
      { email: normalizedEmail, code },
      {
        onSuccess: (user) => {
          notify("success");
          router.replace(
            user.isOnboarded || user.isOnboardingSkipped ? "/(app)/dashboard" : "/(onboarding)/name"
          );
        },
        onError: () => notify("error"),
      }
    );
  }, [code, normalizedEmail, verify]);

  const onChangeAt = (index: number, value: string) => {
    const clean = digitsOnly(value);
    if (clean.length > 1) {
      setCode(clean);
      submittedCode.current = clean.length < 6 ? null : submittedCode.current;
      inputs.current[Math.min(clean.length, 5)]?.focus();
      return;
    }

    const chars = boxes.slice();
    chars[index] = clean;
    const next = chars.join("").slice(0, 6);
    setCode(next);
    submittedCode.current = next.length < 6 ? null : submittedCode.current;
    if (clean && index < 5) inputs.current[index + 1]?.focus();
  };

  const onResend = async () => {
    if (countdown > 0 || !normalizedEmail) return;
    await request.mutateAsync({ email: normalizedEmail });
    setCountdown(60);
    setCode("");
    submittedCode.current = null;
    inputs.current[0]?.focus();
  };

  return (
    <Screen backgroundColor={colors.white}>
      <View className="flex-1">
        <BackButton onPress={() => router.replace(differentEmailTarget)} />
        <View className="flex-1 justify-center gap-xl">
          <View className="gap-sm">
            <Text variant="heading2" color="dark" className="text-center tracking-[-0.5px]">
              Enter your code
            </Text>
            <Text variant="body" color="muted" selectable className="text-center">
              We sent a 6-digit code to {normalizedEmail}.
            </Text>
          </View>

          <View className="gap-md">
            <View className="flex-row justify-center gap-sm">
              {boxes.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(node) => {
                    inputs.current[index] = node;
                  }}
                  accessibilityLabel={`Digit ${index + 1}`}
                  autoFocus={index === 0}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={index === 0 ? 6 : 1}
                  value={digit}
                  editable={!verify.isPending}
                  onChangeText={(value) => onChangeAt(index, value)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !boxes[index] && index > 0) {
                      inputs.current[index - 1]?.focus();
                    }
                  }}
                  className={`h-[54px] w-[46px] rounded-md border bg-white text-center font-semibold text-[22px] text-dark ${
                    verify.error ? "border-error" : digit ? "border-primary" : "border-gray-300"
                  }`}
                  style={{ borderCurve: "continuous", fontVariant: ["tabular-nums"] }}
                />
              ))}
            </View>

            {verify.isPending ? (
              <Text variant="caption" color="muted" className="text-center">
                Verifying...
              </Text>
            ) : null}

            {verify.error ? (
              <Text variant="caption" color="error" selectable className="text-center">
                {verify.error.message}
              </Text>
            ) : null}
          </View>

          <View className="gap-sm">
            <Button
              label={countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              variant="outline"
              disabled={countdown > 0}
              loading={request.isPending}
              onPress={onResend}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              disabled={verify.isPending}
              onPress={() => router.replace(differentEmailTarget)}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
