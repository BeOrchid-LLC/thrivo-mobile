import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StyleSheet, View } from "react-native";
import { Button, Input, Screen, Text } from "@/components";
import { isApiError } from "@/api";
import { signInPayload, type SignInPayload } from "@/contracts";
import { spacing } from "@/theme";
import { useSignIn } from "../hooks/useAuth";

/**
 * Auth gate (ADR-0017). Email+password is wired end-to-end through the typed
 * client; OAuth/Apple are present but disabled until their native flows land.
 * On success the session store updates and the root guard routes onward.
 */
export function SignInScreen() {
  const signIn = useSignIn();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInPayload>({
    resolver: zodResolver(signInPayload),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  const errorMessage =
    signIn.isError && isApiError(signIn.error) ? signIn.error.message : undefined;

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text variant="heading1" color="dark" style={styles.title}>
          Welcome back
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

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {errorMessage ? (
          <Text variant="caption" color="error" accessibilityRole="alert">
            {errorMessage}
          </Text>
        ) : null}

        <Button label="Sign in" loading={signIn.isPending} onPress={onSubmit} />

        <Text variant="caption" color="muted" style={styles.divider}>
          or continue with
        </Text>

        {/* TODO(Phase: auth): wire expo-auth-session / expo-apple-authentication. */}
        <Button label="Continue with Google" variant="secondary" disabled />
        <Button label="Continue with Apple" variant="secondary" disabled />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.xl },
  title: { marginBottom: spacing.sm },
  divider: { textAlign: "center", marginVertical: spacing.xs },
});
