import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Platform, Pressable, View } from "react-native";
import { Button, Input, Screen, Text } from "@/components";
import { otpRequestPayload, type OtpRequestPayload } from "@/contracts";
import { SocialAuthButtons, type SocialAuthProvider } from "../components/SocialAuthButtons";
import { useAppleSignIn, useGoogleSignIn, useRequestOtp } from "../hooks/useAuth";

type SignInParams = { authError?: string };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  expired: "This sign-in code has expired. Request a new one below.",
  auth_failed: "Sign-in didn't complete. Please try again.",
  access_denied: "Google sign-in was cancelled.",
};

function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.auth_failed;
}

export function SignInScreen() {
  const { authError } = useLocalSearchParams<SignInParams>();
  const requestCode = useRequestOtp();
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
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
    formState: { errors },
  } = useForm<OtpRequestPayload>({
    resolver: zodResolver(otpRequestPayload),
    defaultValues: { email: "" },
  });

  const send = handleSubmit(async ({ email }) => {
    await requestCode.mutateAsync({ email });
    router.push({ pathname: "/(auth)/otp", params: { email, source: "sign-in" } });
  });

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
          Welcome back. We&apos;ll email you a secure 6-digit code that expires in 5 minutes.
        </Text>

        {callbackError ? (
          <Text variant="caption" color="error" selectable className="text-center">
            {callbackError}
          </Text>
        ) : null}

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

        {requestCode.error ? (
          <Text variant="caption" color="error" selectable>
            {requestCode.error.message}
          </Text>
        ) : null}

        <Button label="Send code" loading={requestCode.isPending} onPress={send} />

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
