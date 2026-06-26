import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { z } from "zod";
import { BackButton, Button, Input, MailIcon, Screen, Text, UserIcon } from "@/components";
import { colors } from "@/theme";
import { emailSchema } from "@/contracts";
import { useOnboardingDraftActions } from "@/stores";
import { useRequestOtp } from "../hooks/useAuth";

const otpRequestForm = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: emailSchema,
});

type OtpRequestForm = z.infer<typeof otpRequestForm>;

export function OtpRequestScreen() {
  const request = useRequestOtp();
  const { setFields } = useOnboardingDraftActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpRequestForm>({
    resolver: zodResolver(otpRequestForm),
    defaultValues: { name: "", email: "" },
  });

  const send = handleSubmit(async (values) => {
    const name = values.name.trim();
    await request.mutateAsync({ email: values.email });
    setFields({ firstName: name, onboardingStep: 1 });
    router.push({ pathname: "/(auth)/otp", params: { email: values.email, source: "email" } });
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

          {request.error ? (
            <Text variant="caption" color="error" selectable>
              {request.error.message}
            </Text>
          ) : null}

          <Button label="Send code" loading={request.isPending} onPress={send} />
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
