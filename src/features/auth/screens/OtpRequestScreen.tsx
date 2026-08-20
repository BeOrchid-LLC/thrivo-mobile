import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { z } from "zod";
import { useAuth, useSignUp } from "@clerk/expo";
import {
  BackButton,
  Button,
  FormError,
  Input,
  MailIcon,
  Screen,
  Text,
  UserIcon,
} from "@/components";
import { colors } from "@/theme";
import { emailSchema } from "@/contracts";
import { useAuthStatus, useOnboardingDraftActions } from "@/stores";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";

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
        <BackButton />

        <View className="gap-xs">
          <Text variant="heading2" color="dark" className="tracking-[-0.5px]">
            Continue with email
          </Text>
          <Text variant="body" color="muted">
            We&apos;ll send a one-time code to confirm it&apos;s you.
          </Text>
        </View>

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

        <Pressable onPress={() => router.push("/(auth)/sign-in")} className="mt-sm items-center">
          <Text variant="caption" color="muted">
            Already have an account? <Text color="primary">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
