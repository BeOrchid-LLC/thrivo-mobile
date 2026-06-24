import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { z } from "zod";
import {
  BackButton,
  Button,
  CheckCircleIcon,
  Input,
  MailIcon,
  Screen,
  Text,
  UserIcon,
} from "@/components";
import { colors } from "@/theme";
import { emailSchema, magicLinkRequestPayload } from "@/contracts";
import { useRequestMagicLink } from "@/features/auth";
import { useOnboardingDraftActions } from "@/stores";

const signupMagicLinkForm = magicLinkRequestPayload.extend({
  firstName: z.string().trim().min(1, "Enter your first name"),
  email: emailSchema,
});

type SignupMagicLinkForm = z.infer<typeof signupMagicLinkForm>;
type MagicLinkState = "input" | "sent";

export default function MagicLinkScreen() {
  const request = useRequestMagicLink();
  const { setFields } = useOnboardingDraftActions();
  const [state, setState] = useState<MagicLinkState>("input");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignupMagicLinkForm>({
    resolver: zodResolver(signupMagicLinkForm),
    defaultValues: { firstName: "", email: "" },
  });

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
