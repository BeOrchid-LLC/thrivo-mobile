import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { z } from "zod";
import { useAuth, useSignUp } from "@clerk/expo";
import {
  Button,
  FormError,
  Input,
  MailIcon,
  PageHeader,
  Screen,
  Text,
  UserIcon,
} from "@/components";
import { colors } from "@/theme";
import { emailSchema } from "@/contracts";
import { useAuthStatus, useOnboardingDraftActions } from "@/stores";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";
import { AuthSwitchLink } from "../components/AuthSwitchLink";

const otpRequestForm = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: emailSchema,
});

type OtpRequestForm = z.infer<typeof otpRequestForm>;

function clerkErrorMessage(error: { longMessage?: string; message?: string } | null): string {
  if (!error) return "Something went wrong.";
  return error.longMessage ?? error.message ?? "Something went wrong.";
}

export function OtpRequestScreen() {
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const { signUp } = useSignUp();
  const status = useAuthStatus();
  const { setFields } = useOnboardingDraftActions();
  useAuthScreenDiagnostics("email-sign-up", status, clerk);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OtpRequestForm>({
    resolver: zodResolver(otpRequestForm),
    defaultValues: { name: "", email: "" },
  });

  const send = handleSubmit(async (values) => {
    if (!signUp) {
      logAuthError("email-sign-up", "Clerk sign-up unavailable", null);
      return;
    }

    try {
      const name = values.name.trim();
      const [firstName, ...rest] = name.split(" ");
      const lastName = rest.join(" ") || undefined;

      const { error: createError } = await signUp.create({
        firstName,
        lastName,
        emailAddress: values.email,
      });
      if (createError) {
        logAuthError("email-sign-up", "create", createError);
        setError("root", { message: clerkErrorMessage(createError) });
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        logAuthError("email-sign-up", "send email code", sendError);
        setError("root", { message: clerkErrorMessage(sendError) });
        return;
      }

      setFields({ firstName: name, onboardingStep: 1 });
      router.push({ pathname: "/(auth)/otp", params: { email: values.email, source: "email" } });
    } catch (error) {
      logAuthError("email-sign-up", "request", error);
      setError("root", { message: "Something went wrong. Please try again." });
    }
  });

  return (
    <Screen scroll backgroundColor={colors.white}>
      <View className="gap-lg">
        <PageHeader
          title="Sign up for Thrivo"
          subtitle="Create your account. We'll email a secure code to confirm it's you."
        />

        <View className="gap-md">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Name"
                placeholder="Ada Lovelace"
                leadingIcon={<UserIcon />}
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
            No password needed. Your code expires in 5 minutes.
          </Text>

          <FormError message={errors.root?.message} />

          <Button label="Send code" loading={isSubmitting} onPress={send} />
        </View>

        <AuthSwitchLink
          prompt="Already have an account?"
          actionLabel="Sign in"
          onPress={() => router.replace("/(auth)/sign-in")}
        />
      </View>
    </Screen>
  );
}
