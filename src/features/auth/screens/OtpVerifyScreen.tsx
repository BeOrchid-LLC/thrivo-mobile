import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform, TextInput, View } from "react-native";
import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import { Button, FormError, PageHeader, Screen, Text } from "@/components";
import { queueSignup } from "@/lib";
import { colors, inputFont } from "@/theme";
import { useAuthStatus, useBiometricUnlockActions, useSessionActions } from "@/stores";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";

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

function bootLog(message: string): void {
  if (__DEV__) console.info(`[auth] ${message}`);
}

function clerkErrorMessage(error: { longMessage?: string; message?: string } | null): string {
  if (!error) return "Something went wrong.";
  return error.longMessage ?? error.message ?? "Invalid code.";
}

export function OtpVerifyScreen() {
  const { email, source } = useLocalSearchParams<OtpParams>();
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const status = useAuthStatus();
  const { setStatus } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  useAuthScreenDiagnostics("otp", status, clerk);

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
    const flow = isSignUp ? "sign-up" : "sign-in";
    bootLog(`${flow}: verifying email code`);

    if (isSignUp) {
      if (!signUp) {
        setIsPending(false);
        return;
      }
      try {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: digits });
        if (verifyError) {
          bootLog("sign-up: email code rejected");
          notify("error");
          setError(clerkErrorMessage(verifyError));
          return;
        }
        bootLog("sign-up: email code accepted; finalizing Clerk session");
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) {
          bootLog("sign-up: Clerk session finalization failed");
          notify("error");
          setError(clerkErrorMessage(finalizeError));
          return;
        }
        bootLog("sign-up: Clerk session finalized");
        // Top of the funnel. Fires on the sign-up path only — a returning user
        // verifying a code is a sign-in, not a new account.
        queueSignup();
        setStatus("loading");
        notify("success");
        setBiometricUnlocked(true);
      } catch (error) {
        logAuthError("otp-sign-up", "verification", error);
        setError("Something went wrong. Please try again.");
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
          bootLog("sign-in: email code rejected");
          notify("error");
          setError(clerkErrorMessage(verifyError));
          return;
        }
        bootLog("sign-in: email code accepted; finalizing Clerk session");
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          bootLog("sign-in: Clerk session finalization failed");
          notify("error");
          setError(clerkErrorMessage(finalizeError));
          return;
        }
        bootLog("sign-in: Clerk session finalized");
        setStatus("loading");
        notify("success");
        setBiometricUnlocked(true);
      } catch (error) {
        logAuthError("otp-sign-in", "verification", error);
        setError("Something went wrong. Please try again.");
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
    <Screen
      scroll
      backgroundColor={colors.white}
      // The code boxes sit straight under the header; the space the page has
      // left over falls between them and the pinned actions.
      style={{ flexGrow: 1 }}
      header={
        <PageHeader
          title="Enter your code"
          subtitle={`We sent a 6-digit code to ${normalizedEmail}.`}
          onBack={() => router.replace(differentEmailTarget)}
        />
      }
      footer={
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
      }
    >
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
              className={`h-[54px] w-[46px] rounded-md border bg-white text-center ${
                error ? "border-error" : digit ? "border-primary" : "border-gray-300"
              }`}
              style={{
                ...inputFont("otp"),
                borderCurve: "continuous",
                color: colors.dark,
                fontVariant: ["tabular-nums"],
              }}
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
    </Screen>
  );
}
