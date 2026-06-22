import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { z } from "zod";
import {
  BackButton,
  Button,
  CheckCircleIcon,
  ClockIcon,
  Input,
  MailIcon,
  Screen,
  Text,
  UserIcon,
} from "@/components";
import { colors } from "@/theme";
import { isApiError } from "@/api";
import { monitoring } from "@/lib";
import { emailSchema, magicLinkRequestPayload } from "@/contracts";
import { useRequestMagicLink, useVerifyMagicLink } from "@/features/auth";
import { useOnboardingDraftActions } from "@/stores";

const signupMagicLinkForm = magicLinkRequestPayload.extend({
  firstName: z.string().trim().min(1, "Enter your first name"),
  email: emailSchema,
});

type SignupMagicLinkForm = z.infer<typeof signupMagicLinkForm>;
type MagicLinkState = "input" | "sent" | "verifying" | "expired" | "verify_error";

// Connectivity-class failures are retryable; everything else means the link itself
// is no good (expired / already used / invalid).
const TRANSIENT_CODES = new Set(["NETWORK", "TIMEOUT", "SERVER_ERROR"]);

export default function MagicLinkScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const verify = useVerifyMagicLink();
  const request = useRequestMagicLink();
  const { setFields } = useOnboardingDraftActions();
  const [state, setState] = useState<MagicLinkState>(params.token ? "verifying" : "input");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const verified = useRef(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignupMagicLinkForm>({
    resolver: zodResolver(signupMagicLinkForm),
    defaultValues: { firstName: "", email: "" },
  });

  const handleVerify = useCallback(
    (token: string) => {
      setState("verifying");
      verify.mutate(token, {
        onSuccess: (user) => {
          router.replace(
            user.accountStatus === "dormant" ? "/(onboarding)/name" : "/(app)/dashboard"
          );
        },
        onError: (error) => {
          // Capture the real failure so the next build tells us whether the deep
          // link reaches the app and why verification fails.
          monitoring.captureException(error, {
            scope: "magic-link-verify",
            code: isApiError(error) ? error.code : "UNKNOWN",
          });
          const transient = isApiError(error) && TRANSIENT_CODES.has(error.code);
          setState(transient ? "verify_error" : "expired");
        },
      });
    },
    [verify]
  );

  useEffect(() => {
    const token = params.token?.trim();
    if (!token || verified.current) return;
    verified.current = true;
    if (__DEV__) console.info("[magic-link] deep link received; verifying token");
    handleVerify(token);
  }, [params.token, handleVerify]);

  const retryVerify = () => {
    const token = params.token?.trim();
    if (token) handleVerify(token);
  };

  useEffect(() => {
    if (state !== "sent" || countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, state]);

  const startCountdown = () => setCountdown(60);

  const send = handleSubmit(async (values) => {
    const firstName = values.firstName.trim();
    await request.mutateAsync({ firstName, email: values.email });
    setFields({ firstName, onboardingStep: 1 });
    setSentTo(values.email);
    setState("sent");
    startCountdown();
  });

  const resend = async () => {
    if (countdown > 0) return;
    const values = getValues();
    await request.mutateAsync({ firstName: values.firstName.trim(), email: values.email });
    setSentTo(values.email);
    setState("sent");
    startCountdown();
  };

  if (params.token) {
    if (state === "expired") {
      return (
        <Screen backgroundColor={colors.white}>
          <View className="flex-1">
            <BackButton onPress={() => router.replace("/(auth)/magic-link")} />
            <View className="flex-1 items-center justify-center">
              <View className="mb-xl h-[80px] w-[80px] items-center justify-center rounded-pill bg-accentSoft">
                <ClockIcon size={40} />
              </View>
              <Text
                variant="heading2"
                color="dark"
                className="mb-md text-center text-[28px] leading-[34px] tracking-[-0.4px]"
              >
                This link has expired
              </Text>
              <Text variant="body" color="muted" className="mb-2xl text-center">
                Magic links are single-use and expire after 15 minutes. Let&apos;s get you a fresh
                one.
              </Text>
              {sentTo ? (
                <View className="mb-lg w-full">
                  <Input editable={false} value={sentTo} leadingIcon={<MailIcon />} />
                </View>
              ) : null}
              <Button
                label="Send a new link"
                onPress={() => router.replace("/(auth)/magic-link")}
                className="mb-lg"
              />
              <Button
                label="Use a different email"
                variant="ghost"
                onPress={() => router.replace("/(auth)/magic-link")}
              />
            </View>
          </View>
        </Screen>
      );
    }

    if (state === "verify_error") {
      return (
        <Screen backgroundColor={colors.white}>
          <View className="flex-1 items-center justify-center gap-md">
            <Text variant="heading2" color="dark" className="text-center">
              We couldn&apos;t verify your link
            </Text>
            <Text variant="body" color="muted" className="text-center">
              This looks like a connection problem, not an expired link. Check your network and try
              again.
            </Text>
            <Button label="Try again" loading={verify.isPending} onPress={retryVerify} />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => router.replace("/(auth)/magic-link")}
            />
          </View>
        </Screen>
      );
    }

    return (
      <Screen backgroundColor={colors.white}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text variant="heading2" color="dark" className="text-center">
            Verifying your link
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Hang tight while we finish signing you in.
          </Text>
        </View>
      </Screen>
    );
  }

  if (state === "sent") {
    return (
      <Screen backgroundColor={colors.white}>
        <View className="flex-1">
          <BackButton onPress={() => setState("input")} />
          <View className="flex-1 items-center justify-center">
            <View className="mb-xl h-[72px] w-[72px] items-center justify-center rounded-pill bg-primarySoft">
              <CheckCircleIcon />
            </View>
            <Text
              variant="heading3"
              color="dark"
              className="mb-md text-center text-[24px] leading-[36px] tracking-[-0.3px]"
            >
              Check your inbox
            </Text>
            <Text variant="body" color="muted" className="mb-xs text-center">
              We sent a sign-in link to
            </Text>
            <Text variant="body" color="dark" className="mb-2xl text-center font-semibold">
              {sentTo}
            </Text>
            <Text variant="caption" color="muted" className="mb-2xl text-center font-regular">
              The link expires in 15 minutes. Check your spam folder if needed.
            </Text>
            <Button
              label={countdown > 0 ? `Resend in ${countdown}s` : "Resend link"}
              variant="outline"
              disabled={countdown > 0}
              loading={request.isPending}
              onPress={resend}
              className="mb-lg"
            />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => setState("input")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll backgroundColor={colors.white}>
      <View className="gap-lg">
        <BackButton />

        <View className="gap-xs">
          <Text variant="heading2" color="dark" className="tracking-[-0.5px]">
            Enter your email
          </Text>
          <Text variant="body" color="muted">
            We&apos;ll send you a one-time sign-in link.
          </Text>
        </View>

        <View className="gap-md">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First name"
                placeholder="Ada"
                leadingIcon={<UserIcon />}
                autoCapitalize="words"
                autoComplete="given-name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                leadingIcon={<MailIcon />}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Text variant="caption" color="muted">
            We&apos;ll send a one-time link. No password needed.
          </Text>

          {request.error ? (
            <Text variant="caption" color="error" selectable>
              {request.error.message}
            </Text>
          ) : null}

          <Button label="Send magic link" loading={request.isPending} onPress={send} />
        </View>

        <Pressable onPress={() => router.push("/(auth)/sign-in")} className="mt-sm items-center">
          <Text variant="caption" color="muted">
            Already have an account? <Text color="primary">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
