import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, StyleSheet, View } from "react-native";
import { z } from "zod";
import { Button, Input, Screen, Text } from "@/components";
import { emailSchema } from "@/contracts";
import { colors, spacing } from "@/theme";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import { useDemoAuth } from "@/features/auth/hooks/useDemoAuth";

const welcomeForm = z.object({
  name: z.string().min(1, "Enter your name"),
  email: emailSchema,
});
type WelcomeForm = z.infer<typeof welcomeForm>;

/**
 * Onboarding S1 — Figma "Welcome to Thrivo!". Sign-up entry: name + email →
 * magic link, or a social provider. In demo mode every path fabricates a session
 * (no email is actually sent) and the root guard routes on to onboarding.
 */
export default function Welcome() {
  const { signIn, isPending } = useDemoAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WelcomeForm>({
    resolver: zodResolver(welcomeForm),
    defaultValues: { name: "", email: "" },
  });

  const onRequestLink = handleSubmit(() => signIn("magic-link"));

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markGlyph}>T</Text>
          </View>
          <Text variant="heading2" color="dark" style={styles.title}>
            Welcome to Thrivo!
          </Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            Enter your details to receive a magic link and get started.
          </Text>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Name"
              placeholder="Jane Doe"
              autoCapitalize="words"
              autoComplete="name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
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

        <Button label="Request magic link" loading={isPending} onPress={onRequestLink} />

        <Text variant="caption" color="muted" style={styles.divider}>
          or continue with
        </Text>

        <SocialAuthButtons onProvider={(provider) => signIn(provider)} disabled={isPending} />

        <Pressable onPress={() => router.push("/(auth)/sign-in")} style={styles.footer}>
          <Text variant="caption" color="muted">
            Already have an account? <Text color="primary">Sign in</Text>
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
  container: { gap: spacing.lg, paddingTop: spacing.lg },
  hero: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  markGlyph: { color: colors.white, fontSize: 32, fontWeight: "700", lineHeight: 38 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
  divider: { textAlign: "center", marginVertical: spacing.xs },
  footer: { alignItems: "center", marginTop: spacing.sm },
  demoNote: { textAlign: "center", marginTop: spacing.xs },
});
