import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Platform, Pressable, View } from "react-native";
import { Button, Card, Input, Screen, Text } from "@/components";
import { magicLinkRequestPayload, type MagicLinkRequestPayload } from "@/contracts";
import { SocialAuthButtons, type SocialAuthProvider } from "../components/SocialAuthButtons";
import { useAppleSignIn, useGoogleSignIn, useRequestMagicLink } from "../hooks/useAuth";

type SignInParams = { authError?: string };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  expired: "This sign-in link has expired. Request a new one below.",
  auth_failed: "Sign-in didn't complete. Please try again.",
  access_denied: "Google sign-in was cancelled.",
};

function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.auth_failed;
}

export function SignInScreen() {
  const { authError } = useLocalSearchParams<SignInParams>();
  const requestLink = useRequestMagicLink();
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const loadingProvider: SocialAuthProvider | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const socialError = google.error ?? apple.error;
  const showSocialAuth = google.isConfigured || Platform.OS === "ios";
  const callbackError = authErrorMessage(typeof authError === "string" ? authError : undefined);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<MagicLinkRequestPayload>({
    resolver: zodResolver(magicLinkRequestPayload),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const send = handleSubmit(async ({ email }) => {
    await requestLink.mutateAsync({ email });
    setSentTo(email);
    setCountdown(60);
  });

  const resend = async () => {
    if (countdown > 0) return;
    const { email } = getValues();
    await requestLink.mutateAsync({ email });
    setSentTo(email);
    setCountdown(60);
  };

  const onProvider = (provider: SocialAuthProvider) => {
    if (provider === "google") {
      google.mutate();
      return;
    }
    apple.mutate();
  };

  return (
    <Screen scroll>
      <View className="gap-lg pt-xl">
        <Text variant="heading2" color="dark" className="mb-xs">
          Sign in to Thrivo
        </Text>
        <Text variant="body" color="muted" className="mb-sm">
          Welcome back. We&apos;ll email you a secure link that expires in 15 minutes.
        </Text>

        {callbackError ? (
          <Text variant="caption" color="error" selectable className="text-center">
            {callbackError}
          </Text>
        ) : null}

        {sentTo ? (
          <Card className="items-center gap-md">
            <Text variant="heading3" color="dark">
              Check your email
            </Text>
            <Text variant="body" color="muted" className="text-center">
              We sent a sign-in link to {sentTo}.
            </Text>
            <Button
              label={countdown > 0 ? `Resend in ${countdown}s` : "Resend link"}
              variant="secondary"
              disabled={countdown > 0}
              loading={requestLink.isPending}
              onPress={resend}
            />
            <Button label="Use a different email" variant="ghost" onPress={() => setSentTo(null)} />
          </Card>
        ) : (
          <>
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

            {requestLink.error ? (
              <Text variant="caption" color="error" selectable>
                {requestLink.error.message}
              </Text>
            ) : null}

            <Button label="Request magic link" loading={requestLink.isPending} onPress={send} />
          </>
        )}

        {showSocialAuth ? (
          <>
            <Text variant="caption" color="muted" className="my-xs text-center">
              or continue with
            </Text>

            <SocialAuthButtons
              onProvider={onProvider}
              disabled={Boolean(loadingProvider)}
              hiddenProviders={google.isConfigured ? [] : ["google"]}
              loadingProvider={loadingProvider}
            />

            {socialError ? (
              <Text variant="caption" color="error" selectable className="text-center">
                {socialError.message}
              </Text>
            ) : null}
          </>
        ) : null}

        <Pressable onPress={() => router.push("/(auth)/welcome")} className="mt-sm items-center">
          <Text variant="caption" color="muted">
            Don&apos;t have an account? <Text color="primary">Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
