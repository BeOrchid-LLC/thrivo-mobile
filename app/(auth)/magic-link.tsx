import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { z } from "zod";
import { Button, Card, Input, Screen, Text, ThrivoMark } from "@/components";
import { emailSchema, magicLinkRequestPayload } from "@/contracts";
import { useRequestMagicLink, useVerifyMagicLink } from "@/features/auth";
import { useOnboardingDraftActions } from "@/stores";

const signupMagicLinkForm = magicLinkRequestPayload.extend({
  firstName: z.string().trim().min(1, "Enter your first name"),
  email: emailSchema,
});

type SignupMagicLinkForm = z.infer<typeof signupMagicLinkForm>;
type MagicLinkState = "input" | "sent" | "expired";

export default function MagicLinkScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const verify = useVerifyMagicLink();
  const request = useRequestMagicLink();
  const { setFields } = useOnboardingDraftActions();
  const [state, setState] = useState<MagicLinkState>(params.token ? "sent" : "input");
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

  useEffect(() => {
    if (!params.token || verified.current) return;
    verified.current = true;
    verify.mutate(params.token, {
      onSuccess: (user) => {
        router.replace(
          user.accountStatus === "dormant" ? "/(onboarding)/name" : "/(app)/dashboard"
        );
      },
      onError: () => setState("expired"),
    });
  }, [params.token, verify]);

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
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-md">
          {state === "expired" ? (
            <>
              <Text variant="heading2" color="dark" className="text-center">
                This link expired
              </Text>
              <Text variant="body" color="muted" className="text-center">
                Magic links are single-use and expire after 15 minutes.
              </Text>
              <Button
                label="Send a new link"
                onPress={() => router.replace("/(auth)/magic-link")}
              />
            </>
          ) : (
            <>
              <Text variant="heading2" color="dark" className="text-center">
                Verifying your link
              </Text>
              <Text variant="body" color="muted" className="text-center">
                Hang tight while we finish signing you in.
              </Text>
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="gap-lg pt-lg">
        <View className="mb-md items-center gap-xs">
          <ThrivoMark size={56} />
          <Text variant="heading2" color="dark" className="text-center">
            Continue with magic link
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Enter your first name and email. We&apos;ll send a secure link that expires in 15
            minutes.
          </Text>
        </View>

        {state === "sent" ? (
          <Card className="items-center gap-md">
            <Text variant="heading3" color="dark">
              Check your email
            </Text>
            <Text variant="body" color="muted" className="text-center">
              We sent a sign-in link to {sentTo}. Open it on this device to continue.
            </Text>
            <Button
              label={countdown > 0 ? `Resend in ${countdown}s` : "Resend link"}
              variant="secondary"
              disabled={countdown > 0}
              loading={request.isPending}
              onPress={resend}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => setState("input")}
            />
          </Card>
        ) : (
          <>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="First name"
                  placeholder="Ada"
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

            {request.error ? (
              <Text variant="caption" color="error" selectable>
                {request.error.message}
              </Text>
            ) : null}

            <Button label="Send magic link" loading={request.isPending} onPress={send} />
          </>
        )}

        <Pressable onPress={() => router.push("/(auth)/sign-in")} className="mt-sm items-center">
          <Text variant="caption" color="muted">
            Already have an account? <Text color="primary">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
