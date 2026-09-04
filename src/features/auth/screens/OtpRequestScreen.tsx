import { View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useSignUp } from "@clerk/expo";
import { Button, FormError, Input, MailIcon } from "@/components";
import { emailSchema } from "@/contracts";
import { useAuthStatus, useOnboardingDraftActions } from "@/stores";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";
import { AuthScreenShell } from "../components/AuthScreenShell";
import { AuthSwitchLink } from "../components/AuthSwitchLink";

const BUTTON_HEIGHT = 52;
/** Figma sits the two field groups closer than the page's 32pt form rhythm. */
const FIELD_GAP = 22;

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
    <AuthScreenShell
      title="Welcome to Thrivo!"
      subtitle="Enter your details to receive a verification code and get started."
    >
      <View style={{ gap: FIELD_GAP }}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Name"
              placeholder="Jane Doe"
              hint="What should we call you?"
              autoCapitalize="words"
              autoComplete="name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              variant="auth"
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
              placeholder="user@sampleemail.com"
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
      </View>

      <FormError message={errors.root?.message} />

      <Button label="Request Code" loading={isSubmitting} onPress={send} />

      <AuthSwitchLink
        prompt="Already have an account?"
        actionLabel="Sign In"
        onPress={() => router.replace("/(auth)/sign-in")}
      />
    </AuthScreenShell>
  );
}
