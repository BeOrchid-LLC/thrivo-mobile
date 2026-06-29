import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import { LockKey } from "phosphor-react-native";
import { Button, Text } from "@/components";
import { authenticateBiometric, isBiometricAvailable } from "@/lib";
import { useBiometricAuthEnabled, useIsAuthenticated } from "@/stores";
import { colors } from "@/theme";

/**
 * Device-local biometric lock for the authenticated app. When the user has
 * enabled biometric auth (a device-only preference, never persisted to the
 * backend), the app content is covered by a lock overlay on launch and whenever
 * it returns to the foreground, until a biometric/passcode match succeeds.
 *
 * Fails *open* only when the device has no enrolled biometric (so a user who
 * loses enrollment isn't stranded); otherwise it stays locked until unlocked.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const enabled = useBiometricAuthEnabled();
  const isAuthenticated = useIsAuthenticated();
  const active = enabled && isAuthenticated;

  const [locked, setLocked] = useState(active);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  // Never hold the lock when the feature is off or the session has ended.
  useEffect(() => {
    if (!active) setLocked(false);
  }, [active]);

  // Re-lock whenever the app returns to the foreground (if the feature is on).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const cameToForeground = /inactive|background/.test(appState.current) && next === "active";
      appState.current = next;
      if (cameToForeground && active) setLocked(true);
    });
    return () => sub.remove();
  }, [active]);

  // Auto-present the biometric prompt as soon as we enter the locked state. The
  // attempt is cancellable so a state change (e.g. unmount) doesn't unlock late.
  useEffect(() => {
    if (!active || !locked) return;
    let cancelled = false;
    setAuthenticating(true);
    void (async () => {
      try {
        // Don't strand a user whose device lost biometric enrollment.
        const available = await isBiometricAvailable();
        if (cancelled) return;
        if (!available || (await authenticateBiometric())) {
          if (!cancelled) setLocked(false);
        }
      } finally {
        if (!cancelled) setAuthenticating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, locked]);

  // Manual retry from the lock screen — independent of the auto attempt.
  const retry = () => {
    setAuthenticating(true);
    void authenticateBiometric()
      .then((ok) => {
        if (ok) setLocked(false);
      })
      .finally(() => setAuthenticating(false));
  };

  return (
    <View className="flex-1">
      {children}
      {active && locked ? (
        <View className="absolute inset-0 z-50 items-center justify-center gap-lg bg-light px-xl">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-pill bg-primarySoft">
            <LockKey size={32} color={colors.primary} />
          </View>
          <Text variant="heading2" color="dark">
            Thrivo is locked
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Unlock with Face ID, Touch ID, or your device passcode to continue.
          </Text>
          <Button label="Unlock" loading={authenticating} onPress={retry} />
        </View>
      ) : null}
    </View>
  );
}
