import { Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useSignIn } from "@clerk/expo";
import { Button, FormError, Input, MailIcon } from "@/components";
import { emailSchema } from "@/contracts";
import { useAuthStatus, useOnboardingDraft } from "@/stores";
import appleIcon from "../../../assets/auth-apple.png";
import googleIcon from "../../../assets/auth-google.png";
import { AuthDivider } from "../components/AuthDivider";
import { AuthProviderButton } from "../components/AuthProviderButton";
import { AuthScreenShell } from "../components/AuthScreenShell";
import { AuthSwitchLink } from "../components/AuthSwitchLink";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";
import { useAppleSignIn, useGoogleSignIn } from "../hooks/useAuth";

type SignInParams = { authError?: string };
type SocialProvider = "google" | "apple";

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
  // The draft keeps the name from this device's last sign-up, so a returning
  // user gets greeted by name; a fresh install just gets the plain welcome.
  const firstName = useOnboardingDraft().firstName?.trim().split(" ")[0];
  const loadingProvider: SocialProvider | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const socialError = google.error ?? apple.error;
  const showGoogle = google.isConfigured;
  const showApple = Platform.OS === "ios" && apple.isConfigured;
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

  return (
    <AuthScreenShell
      title="Sign In to Thrivo"
      subtitle={`Welcome back${firstName ? `, ${firstName}` : ""}! Request your magic link to continue.`}
      // Narrower than the shell default so the greeting breaks after "your",
      // the way the Sign In frame does.
      subtitleWidth={292}
    >
      <FormError message={callbackError} center />

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
            variant="auth"
            error={errors.email?.message}
          />
        )}
      />

      <FormError message={errors.root?.message} />

      <Button label="Request Magic Link" loading={isSubmitting} onPress={send} />

      {showGoogle || showApple ? (
        <>
          <AuthDivider />

          {showApple ? (
            <AuthProviderButton
              icon={appleIcon}
              iconSize={24}
              label="Continue with Apple ID"
              loading={loadingProvider === "apple"}
              disabled={Boolean(loadingProvider) || isSubmitting}
              onPress={() => apple.mutate()}
            />
          ) : null}

          {showGoogle ? (
            <AuthProviderButton
              icon={googleIcon}
              label="Continue with Google"
              loading={loadingProvider === "google"}
              disabled={Boolean(loadingProvider) || isSubmitting}
              onPress={() => google.mutate()}
            />
          ) : null}

          <FormError message={socialError?.message} center />
        </>
      ) : null}

      <AuthSwitchLink
        prompt="Don't have an account yet?"
        actionLabel="Sign Up"
        onPress={() => router.replace("/(auth)/email")}
      />
    </AuthScreenShell>
  );
}
