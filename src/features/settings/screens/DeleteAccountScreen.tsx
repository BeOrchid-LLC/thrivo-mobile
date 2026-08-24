import { useRef, useState } from "react";
import { router } from "expo-router";
import { TextInput, View } from "react-native";
import { Warning } from "phosphor-react-native";
import { Button, FormError, PageHeader, Screen, Text } from "@/components";
import { useEntitlement } from "@/hooks";
import { colors, rhythm } from "@/theme";
import { useDeleteAccount } from "../hooks/useDeleteAccount";
import { useReauthentication } from "../hooks/useReauthentication";

const DELETED_ITEMS = [
  "Your profile, goals, and personal details",
  "Every food, water, weight, and check-in entry",
  "Your streaks, progress history, and insights",
  "Your sign-in identity — the same email can be used to start over",
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

/**
 * Account deletion. Required by App Store review for any app that creates
 * accounts, and gated behind a re-authentication step because it is
 * irreversible.
 *
 * Three stages on one screen — review what is lost, prove it is really you, then
 * delete — so the user always knows which step they are on and what is left.
 */
export function DeleteAccountScreen() {
  const [stage, setStage] = useState<"review" | "verify">("review");
  const [code, setCode] = useState("");
  const codeInput = useRef<TextInput>(null);
  const reauth = useReauthentication();
  const deleteAccount = useDeleteAccount();
  const { isPremium } = useEntitlement();

  const isWorking = reauth.step === "sending" || reauth.step === "verifying";
  const isDeleting = deleteAccount.isPending;

  const onStartVerification = async () => {
    const sent = await reauth.sendCode();
    if (!sent) return;
    setStage("verify");
    // Give the keyboard a frame to settle before pulling focus.
    requestAnimationFrame(() => codeInput.current?.focus());
  };

  const onConfirmDelete = async () => {
    const verified = await reauth.verifyCode(code);
    if (!verified) {
      setCode("");
      return;
    }

    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        // The session is gone; send them to the unauthenticated root rather than
        // letting the guard bounce them through a half-torn-down tab layout.
        router.replace("/(auth)/welcome");
      },
    });
  };

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      backgroundColor={colors.white}
      header={
        <PageHeader
          title="Delete account"
          subtitle={
            stage === "review"
              ? "This permanently removes your account and everything in it."
              : `Enter the 6-digit code we sent to ${reauth.email ?? "your email"}.`
          }
        />
      }
      footer={
        stage === "review" ? (
          <View className="gap-md">
            <Button
              label="Continue"
              variant="secondary"
              loading={reauth.step === "sending"}
              className="bg-red-100"
              onPress={onStartVerification}
            />
            <Button label="Keep my account" onPress={() => router.back()} />
          </View>
        ) : (
          <View className="gap-md">
            <Button
              label={isDeleting ? "Deleting your account…" : "Delete my account"}
              variant="secondary"
              className="bg-red-100"
              disabled={code.length < 6}
              loading={reauth.step === "verifying" || isDeleting}
              onPress={onConfirmDelete}
            />
            <Button
              label="Cancel"
              disabled={isDeleting}
              onPress={() => {
                setCode("");
                reauth.clearError();
                setStage("review");
              }}
            />
          </View>
        )
      }
      style={{ gap: rhythm.pageGap, paddingTop: 0, paddingBottom: rhythm.pageBottom }}
    >
      {stage === "review" ? (
        <>
          <View className="flex-row items-start gap-md rounded-lg border border-red-200 bg-red-50 px-lg py-md">
            <Warning size={22} color={colors.error} />
            <Text color="error" className="flex-1 font-semibold">
              This cannot be undone. Deleted data cannot be recovered, and support cannot restore it
              for you.
            </Text>
          </View>

          <View className="gap-md">
            <Text variant="body-lg" className="font-semibold">
              What gets deleted
            </Text>
            {DELETED_ITEMS.map((item) => (
              <View key={item} className="flex-row gap-md">
                <Text color="muted">•</Text>
                <Text className="flex-1">{item}</Text>
              </View>
            ))}
          </View>

          {isPremium ? (
            // Deleting the account cannot cancel a store subscription — only the
            // store can. Saying so here prevents a "you kept charging me" report.
            <View className="rounded-lg border border-yellow-200 bg-yellow-50 px-lg py-md">
              <Text color="warningText" className="font-semibold">
                Cancel your subscription first
              </Text>
              <Text color="warningText" className="mt-xs">
                Deleting your account does not cancel billing. Cancel in your app store subscription
                settings, or you may continue to be charged.
              </Text>
            </View>
          ) : null}

          <FormError message={reauth.error} />
        </>
      ) : (
        <>
          <Text color="muted">For your security, confirm it is you before we delete anything.</Text>

          <TextInput
            ref={codeInput}
            accessibilityLabel="Verification code"
            className="min-h-[56px] rounded-md border border-gray-300 px-lg text-center text-2xl tracking-[8px]"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            editable={!isWorking && !isDeleting}
            value={code}
            onChangeText={(value) => setCode(digitsOnly(value))}
            placeholder="000000"
            placeholderTextColor={colors.gray[400]}
          />

          <FormError
            message={
              reauth.error ??
              (deleteAccount.isError
                ? "We couldn't delete your account. Nothing was removed — please try again."
                : null)
            }
          />

          {isDeleting ? (
            <Text color="muted" className="text-center">
              Removing your data. This can take a moment — please stay on this screen.
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}
