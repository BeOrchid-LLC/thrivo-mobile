import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Input, Screen, Text } from "@/components";
import { magicLinkRequestPayload, type MagicLinkRequestPayload } from "@/contracts";
import { spacing } from "@/theme";
import { SocialAuthButtons, type SocialAuthProvider } from "../components/SocialAuthButtons";
import { useAppleSignIn, useGoogleSignIn, useRequestMagicLink } from "../hooks/useAuth";

export function SignInScreen() {
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
      <View style={styles.container}>
        <Text variant="heading2" color="dark" style={styles.title}>
          Sign in to Thrivo
        </Text>
        <Text variant="body" color="muted" style={styles.subtitle}>
          Welcome back. We&apos;ll email you a secure link that expires in 15 minutes.
        </Text>

        {sentTo ? (
          <Card style={styles.sentCard}>
            <Text variant="heading3" color="dark">
              Check your email
            </Text>
            <Text variant="body" color="muted" style={styles.centerText}>
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
            <Text variant="caption" color="muted" style={styles.divider}>
              or continue with
            </Text>

            <SocialAuthButtons
              onProvider={onProvider}
              disabled={Boolean(loadingProvider)}
              hiddenProviders={google.isConfigured ? [] : ["google"]}
              loadingProvider={loadingProvider}
            />

            {socialError ? (
              <Text variant="caption" color="error" selectable style={styles.centerText}>
                {socialError.message}
              </Text>
            ) : null}
          </>
        ) : null}

        <Pressable onPress={() => router.push("/(auth)/welcome")} style={styles.footer}>
          <Text variant="caption" color="muted">
            Don&apos;t have an account? <Text color="primary">Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.xl },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.sm },
  sentCard: { alignItems: "center", gap: spacing.md },
  centerText: { textAlign: "center" },
  divider: { textAlign: "center", marginVertical: spacing.xs },
  footer: { alignItems: "center", marginTop: spacing.sm },
});
