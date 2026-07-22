import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/expo";
import { BackButton, Button, FormError, Screen, Text } from "@/components";
import { colors } from "@/theme";
import { useBiometricUnlockActions, useSessionActions } from "@/stores";

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

function clerkErrorMessage(error: { longMessage?: string; message?: string } | null): string {
  if (!error) return "Something went wrong.";
  return error.longMessage ?? error.message ?? "Invalid code.";
}

export function OtpVerifyScreen() {
  const { email, source } = useLocalSearchParams<OtpParams>();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { setStatus } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();

  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedCode = useRef<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);
  const normalizedEmail = typeof email === "string" ? email : "";
  const isSignUp = source === "email";
  const boxes = useMemo(() => Array.from({ length: 6 }, (_, index) => code[index] ?? ""), [code]);
  const differentEmailTarget = isSignUp ? "/(auth)/email" : "/(auth)/sign-in";

  useEffect(() => {
    if (!normalizedEmail) router.replace("/(auth)/email");
  }, [normalizedEmail]);

  useEffect(() => {
    const timer = setTimeout(() => inputs.current[0]?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const verify = async (digits: string) => {
    setIsPending(true);
    setError(null);

    if (isSignUp) {
      if (!signUp) {
        setIsPending(false);
        return;
      }
      try {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: digits });
        if (verifyError) {
          notify("error");
          setError(clerkErrorMessage(verifyError));
          return;
        }
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) {
          notify("error");
          setError(clerkErrorMessage(finalizeError));
          return;
        }
        notify("success");
        setBiometricUnlocked(true);
        setStatus("loading");
      } finally {
        setIsPending(false);
      }
    } else {
      if (!signIn) {
        setIsPending(false);
        return;
      }
      try {
        const { error: verifyError } = await signIn.emailCode.verifyCode({ code: digits });
        if (verifyError) {
          notify("error");
          setError(clerkErrorMessage(verifyError));
          return;
        }
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          notify("error");
          setError(clerkErrorMessage(finalizeError));
          return;
        }
        notify("success");
        setBiometricUnlocked(true);
        setStatus("loading");
      } finally {
        setIsPending(false);
      }
    }
  };

  useEffect(() => {
    if (code.length !== 6 || isPending || submittedCode.current === code) return;
    submittedCode.current = code;
    void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isPending]);

  const onResend = async () => {
    if (countdown > 0 || !normalizedEmail) return;
    setIsResending(true);
    setError(null);
    try {
      if (isSignUp) {
        if (!signUp) return;
        const { error: resendError } = await signUp.verifications.sendEmailCode();
        if (resendError) {
          setError(clerkErrorMessage(resendError));
          return;
        }
      } else {
        if (!signIn) return;
        const { error: resendError } = await signIn.emailCode.sendCode();
        if (resendError) {
          setError(clerkErrorMessage(resendError));
          return;
        }
      }
      setCountdown(60);
      setCode("");
      submittedCode.current = null;
      inputs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

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

  return (
    <Screen scroll backgroundColor={colors.white} style={{ flexGrow: 1 }}>
      <View className="gap-xl pt-xl">
        <BackButton onPress={() => router.replace(differentEmailTarget)} />

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
                editable={!isPending}
                onChangeText={(value) => onChangeAt(index, value)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === "Backspace" && !boxes[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                className={`h-[54px] w-[46px] rounded-md border bg-white text-center font-semibold text-[22px] text-dark ${
                  error ? "border-error" : digit ? "border-primary" : "border-gray-300"
                }`}
                style={{ borderCurve: "continuous", fontVariant: ["tabular-nums"] }}
              />
            ))}
          </View>

          {isPending ? (
            <Text variant="caption" color="muted" className="text-center">
              Verifying...
            </Text>
          ) : null}

          <FormError message={error} center />
        </View>

        <View className="gap-sm">
          <Button
            label={countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
            variant="outline"
            disabled={countdown > 0}
            loading={isResending}
            onPress={onResend}
          />
          <Button
            label="Use a different email"
            variant="ghost"
            disabled={isPending}
            onPress={() => router.replace(differentEmailTarget)}
          />
        </View>
      </View>
    </Screen>
  );
}
