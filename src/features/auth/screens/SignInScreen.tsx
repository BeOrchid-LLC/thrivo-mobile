import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { z } from "zod";
import { useAuth, useSignIn } from "@clerk/expo";
import { Button, FormError, Input, PageHeader, Screen, Text } from "@/components";
import { emailSchema } from "@/contracts";
import { useAuthStatus } from "@/stores";
import { SocialAuthButtons, type SocialAuthProvider } from "../components/SocialAuthButtons";
import { AuthSwitchLink } from "../components/AuthSwitchLink";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";
import { useAppleSignIn, useGoogleSignIn } from "../hooks/useAuth";

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

function clerkErrorMessage(error: { longMessage?: string; message?: string } | null): string {
  if (!error) return "Something went wrong.";
  return error.longMessage ?? error.message ?? "Something went wrong.";
}

const signInForm = z.object({ email: emailSchema });
type SignInForm = z.infer<typeof signInForm>;

export function SignInScreen() {
  const { authError } = useLocalSearchParams<SignInParams>();
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const { signIn } = useSignIn();
  const status = useAuthStatus();
  useAuthScreenDiagnostics("email-sign-in", status, clerk);
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const loadingProvider: SocialAuthProvider | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const socialError = google.error ?? apple.error;
  const showSocialAuth = google.isConfigured || apple.isConfigured;
  const hiddenProviders: SocialAuthProvider[] = (["google", "apple"] as const).filter((provider) =>
    provider === "google" ? !google.isConfigured : !apple.isConfigured
  );
  const callbackError = authErrorMessage(typeof authError === "string" ? authError : undefined);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInForm),
    defaultValues: { email: "" },
  });

  const send = handleSubmit(async ({ email }) => {
    if (!signIn) {
      logAuthError("email-sign-in", "Clerk sign-in unavailable", null);
      return;
    }

    try {
      const { error: createError } = await signIn.create({ identifier: email });
      if (createError) {
        logAuthError("email-sign-in", "create", createError);
        setError("root", { message: clerkErrorMessage(createError) });
        return;
      }

      const emailFactor = signIn.supportedFirstFactors?.find(
        (f): f is Extract<typeof f, { strategy: "email_code" }> => f.strategy === "email_code"
      );
      if (!emailFactor) {
        logAuthError("email-sign-in", "email code factor unavailable", null);
        setError("root", { message: "Email sign-in is not available for this account." });
        return;
      }

      const { error: sendError } = await signIn.emailCode.sendCode();
      if (sendError) {
        logAuthError("email-sign-in", "send email code", sendError);
        setError("root", { message: clerkErrorMessage(sendError) });
        return;
      }

      router.push({ pathname: "/(auth)/otp", params: { email, source: "sign-in" } });
    } catch (error) {
      logAuthError("email-sign-in", "request", error);
      setError("root", { message: "Something went wrong. Please try again." });
    }
  });

  const onProvider = (provider: SocialAuthProvider) => {
    if (provider === "google") {
      google.mutate();
      return;
    }
    apple.mutate();
  };

  return (
    <Screen
      scroll
      header={
        <PageHeader
          title="Sign in to Thrivo"
          subtitle="Welcome back. We'll email you a secure 6-digit code that expires in 5 minutes."
        />
      }
    >
      <View className="gap-lg">
        <View className="mt-md gap-lg">
          <FormError message={callbackError} center />

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

          <FormError message={errors.root?.message} />

          <Button label="Send code" loading={isSubmitting} onPress={send} />

          {showSocialAuth ? (
            <>
              <Text variant="caption" color="muted" className="my-xs text-center">
                or continue with
              </Text>

              <SocialAuthButtons
                onProvider={onProvider}
                disabled={Boolean(loadingProvider) || isSubmitting}
                hiddenProviders={hiddenProviders}
                loadingProvider={loadingProvider}
              />

              <FormError message={socialError?.message} center />
            </>
          ) : null}
        </View>

        <AuthSwitchLink
          prompt="Don't have an account?"
          actionLabel="Sign up"
          onPress={() => router.replace("/(auth)/email")}
        />
      </View>
    </Screen>
  );
}
