import { useState } from "react";
import { useSession, useUser } from "@clerk/expo";

/**
 * Re-verifies the signed-in user before a destructive action.
 *
 * Uses Clerk's **session reverification** flow, not email-address verification.
 * The distinction matters: `emailAddress.attemptVerification()` exists to verify
 * an address for the first time, so on an account whose email was already
 * verified at sign-up it fails with "This verification has already been
 * verified". Session reverification instead re-challenges the *session* with a
 * fresh first factor — for this passwordless instance, an emailed one-time code,
 * the same factor used to sign in.
 *
 * Note: session reverification is a Clerk public-beta API. If it is unavailable
 * on the instance, `sendCode` surfaces the error rather than silently skipping
 * the challenge — a deletion must never proceed unverified.
 */
export type ReauthStep = "idle" | "sending" | "awaiting_code" | "verifying" | "verified";

function clerkErrorMessage(error: unknown, fallback: string): string {
  const clerkError = error as { errors?: { longMessage?: string; message?: string }[] } | null;
  const first = clerkError?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

export function useReauthentication() {
  const { session } = useSession();
  const { user } = useUser();
  const [step, setStep] = useState<ReauthStep>("idle");
  const [error, setError] = useState<string | null>(null);
  // Captured from the challenge so the attempt targets the same address.
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const sendCode = async (): Promise<boolean> => {
    if (!session) {
      setError("Your session has expired. Please sign in again.");
      return false;
    }

    setStep("sending");
    setError(null);
    try {
      const verification = await session.startVerification({ level: "first_factor" });

      // Take the address id from the factors Clerk says it supports rather than
      // assuming the primary address is challengeable.
      const emailFactor = verification.supportedFirstFactors?.find(
        (factor): factor is Extract<typeof factor, { strategy: "email_code" }> =>
          factor.strategy === "email_code"
      );
      if (!emailFactor) {
        setStep("idle");
        setError("This account can't be verified by email code. Please contact support.");
        return false;
      }

      await session.prepareFirstFactorVerification({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setEmailAddressId(emailFactor.emailAddressId);
      setStep("awaiting_code");
      return true;
    } catch (caught) {
      setStep("idle");
      setError(clerkErrorMessage(caught, "We couldn't send the code. Please try again."));
      return false;
    }
  };

  const verifyCode = async (code: string): Promise<boolean> => {
    if (!session || !emailAddressId) return false;

    setStep("verifying");
    setError(null);
    try {
      const verification = await session.attemptFirstFactorVerification({
        strategy: "email_code",
        code,
      });

      if (verification.status !== "complete") {
        setStep("awaiting_code");
        setError("That code isn't right. Please check and try again.");
        return false;
      }

      setStep("verified");
      return true;
    } catch (caught) {
      // Back to code entry so the user can retry without restarting the flow.
      setStep("awaiting_code");
      setError(clerkErrorMessage(caught, "That code isn't right. Please check and try again."));
      return false;
    }
  };

  return { email, step, error, sendCode, verifyCode, clearError: () => setError(null) };
}
