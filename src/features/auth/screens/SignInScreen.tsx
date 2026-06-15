import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Input, Screen, Text } from "@/components";
import { otpRequestPayload, type OtpRequestPayload } from "@/contracts";
import { spacing } from "@/theme";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { useDemoAuth } from "../hooks/useDemoAuth";

/**
 * Auth gate — Figma "Sign In to Thrivo" (returning user). Magic-link by email or
 * a social provider; iOS additionally shows Apple (see `SocialAuthButtons`). In
 * demo mode every path fabricates a session via `useDemoAuth` (no network) and
 * the root guard routes onward. The real password/OAuth wiring lives in
 * `useAuth` for when the backend lands.
 */
export function SignInScreen() {
  const { signIn, isPending } = useDemoAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpRequestPayload>({
    resolver: zodResolver(otpRequestPayload),
    defaultValues: { email: "" },
  });

  const onRequestLink = handleSubmit(() => signIn("magic-link"));

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text variant="heading2" color="dark" style={styles.title}>
          Sign in to Thrivo
        </Text>
        <Text variant="body" color="muted" style={styles.subtitle}>
          Welcome back. We&apos;ll email you a magic link to continue.
        </Text>

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

        <Button label="Request magic link" loading={isPending} onPress={onRequestLink} />

        <Text variant="caption" color="muted" style={styles.divider}>
          or continue with
        </Text>

        <SocialAuthButtons onProvider={(provider) => signIn(provider)} disabled={isPending} />

        <Pressable onPress={() => router.push("/(auth)/welcome")} style={styles.footer}>
          <Text variant="caption" color="muted">
            Don&apos;t have an account? <Text color="primary">Sign up</Text>
          </Text>
        </Pressable>

        <Text variant="caption" color="muted" style={styles.demoNote}>
          Demo mode — no real account or email needed.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.xl },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.sm },
  divider: { textAlign: "center", marginVertical: spacing.xs },
  footer: { alignItems: "center", marginTop: spacing.sm },
  demoNote: { textAlign: "center", marginTop: spacing.xs },
});
