import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import {
  Bell,
  CaretRight,
  Clock,
  FileText,
  FingerprintSimple,
  Ruler,
  ShieldCheck,
  Ticket,
  X,
} from "phosphor-react-native";
import { Button, Screen, SectionError, SkeletonText, Text } from "@/components";
import { LEGAL_LINKS } from "@/config/links";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useMe } from "@/features/profile";
import { useSubscription } from "@/features/subscription";
import { authenticateBiometric, isBiometricAvailable } from "@/lib";
import { useBiometricAuthEnabled, usePreferencesActions } from "@/stores";
import { colors } from "@/theme";
import { useSettings } from "../hooks/useSettings";
import { useUpdateSettings } from "../hooks/useUpdateSettings";

function initials(name?: string | null) {
  const parts = (name || "Thrivo User").trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "T"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function shortDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

function nextHydrationInterval(current: number) {
  const options = [30, 40, 60, 90, 120];
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? 40;
}

/** "HH:mm[:ss]" → a Date today at that clock time (for the native picker). */
function timeToDate(value?: string) {
  const [h = "8", m = "0"] = (value ?? "08:00").split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date;
}

/** Date → "HH:mm" for the settings payload. */
function dateToTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(value?: string) {
  if (!value) return "";
  const [h = "0", m = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function subscriptionTitle(plan?: string | null) {
  if (plan === "annual") return "Thrivo annual";
  return "Thrivo monthly";
}

function Row({
  icon,
  iconWide = false,
  title,
  subtitle,
  action,
  onPress,
}: {
  icon: ReactNode;
  iconWide?: boolean;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View className="min-h-[72px] flex-row items-center gap-md border-b border-gray-200 px-lg py-md">
      <View className={`${iconWide ? "w-[64px]" : "w-[32px]"} items-center`}>{icon}</View>
      <View className="flex-1">
        <Text className="font-semibold text-[16px]">{title}</Text>
        {typeof subtitle === "string" ? (
          <Text variant="caption" color="muted" className="mt-xxs text-[13px]">
            {subtitle}
          </Text>
        ) : subtitle ? (
          subtitle
        ) : null}
      </View>
      {action}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-sm">
      <Text className="text-[17px]">{title}</Text>
      <View className="overflow-hidden rounded-lg border border-gray-200 bg-white">{children}</View>
    </View>
  );
}

export function SettingsScreen() {
  const profile = useMe();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const subscription = useSubscription();
  const logout = useLogout();

  const biometricEnabled = useBiometricAuthEnabled();
  const { setBiometricAuthEnabled } = usePreferencesActions();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Which reminder-time field the native time picker is currently editing.
  const [editingTime, setEditingTime] = useState<
    "dailyFoodLogReminderTime" | "weightCheckReminderTime" | null
  >(null);

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Enabling requires proving a successful unlock first; disabling is immediate.
  const onToggleBiometric = async (next: boolean) => {
    if (!next) {
      setBiometricAuthEnabled(false);
      return;
    }
    setBiometricBusy(true);
    try {
      if (await authenticateBiometric("Enable biometric unlock")) {
        setBiometricAuthEnabled(true);
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  const user = profile.data;
  const userSettings = settings.data;
  const sub = subscription.data?.subscription;
  const renewsAt = shortDate(sub?.renewsAt ?? sub?.accessEndsAt);

  const onTimePicked = (event: DateTimePickerEvent, date?: Date) => {
    const field = editingTime;
    setEditingTime(null); // Android dialog is one-shot; iOS spinner closes too.
    if (event.type !== "set" || !date || !field) return;
    updateSettings.mutate({ [field]: dateToTime(date) });
  };

  const subscriptionSubtitle = useMemo(() => {
    if (!sub || sub.status === "none" || sub.status === "expired") return "Choose a plan";
    if (sub.cancelAtPeriodEnd && renewsAt) return `Access until ${renewsAt}`;
    if (renewsAt) return `Active - Renews ${renewsAt}`;
    return "Active";
  }, [renewsAt, sub]);
  const settingsLoading = settings.isLoading || !userSettings;

  return (
    <Screen scroll backgroundColor={colors.white} style={{ gap: 26, paddingBottom: 120 }}>
      <Text variant="heading2">Settings</Text>

      <Section title="Profile">
        <Row
          iconWide
          icon={
            <View className="h-[64px] w-[64px] items-center justify-center rounded-full bg-primarySoft">
              <Text className="font-semibold text-[20px]">{initials(user?.name)}</Text>
            </View>
          }
          title={user?.name || "Your profile"}
          subtitle={
            profile.isLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-2/3" />
            ) : (
              `${user?.email ?? "Email"}, weight, goal`
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Edit</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() => router.push("/(app)/settings/personal-info")}
        />
        <Row
          icon={<Ruler size={24} color={colors.dark} />}
          title="Units"
          subtitle={
            settingsLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/3" />
            ) : userSettings.unitSystem === "imperial" ? (
              "lb / in"
            ) : (
              "kg / cm"
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Edit</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={
            settingsLoading
              ? undefined
              : () =>
                  updateSettings.mutate({
                    unitSystem: userSettings.unitSystem === "imperial" ? "metric" : "imperial",
                  })
          }
        />
        {profile.isError ? (
          <SectionError
            title="Could not load profile"
            message="Profile editing is still available once this refreshes."
            onRetry={() => void profile.refetch()}
            className="m-lg"
          />
        ) : null}
        {settings.isError ? (
          <SectionError
            title="Could not load settings"
            message="Try again before changing preferences."
            onRetry={() => void settings.refetch()}
            className="m-lg"
          />
        ) : null}
      </Section>

      <Section title="Notifications">
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Daily food log reminder"
          action={
            <Switch
              value={Boolean(userSettings?.dailyFoodLogReminderEnabled)}
              disabled={settingsLoading}
              onValueChange={(dailyFoodLogReminderEnabled) =>
                updateSettings.mutate({ dailyFoodLogReminderEnabled })
              }
              trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
            />
          }
        />
        <Row
          icon={<Bell size={22} color={colors.dark} />}
          title="Reminder time"
          subtitle={
            settingsLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/3" />
            ) : (
              formatTime(userSettings.dailyFoodLogReminderTime)
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={settingsLoading ? undefined : () => setEditingTime("dailyFoodLogReminderTime")}
        />
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Weight check"
          action={
            <Switch
              value={Boolean(userSettings?.weightCheckReminderEnabled)}
              disabled={settingsLoading}
              onValueChange={(weightCheckReminderEnabled) =>
                updateSettings.mutate({ weightCheckReminderEnabled })
              }
              trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
            />
          }
        />
        <Row
          icon={<Bell size={22} color={colors.dark} />}
          title="Reminder time"
          subtitle={
            settingsLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/2" />
            ) : (
              `Weekly, Friday ${formatTime(userSettings.weightCheckReminderTime)}`
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={settingsLoading ? undefined : () => setEditingTime("weightCheckReminderTime")}
        />
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Hydration"
          action={
            <Switch
              value={Boolean(userSettings?.hydrationReminderEnabled)}
              disabled={settingsLoading}
              onValueChange={(hydrationReminderEnabled) =>
                updateSettings.mutate({ hydrationReminderEnabled })
              }
              trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
            />
          }
        />
        <Row
          icon={<Bell size={22} color={colors.dark} />}
          title="Reminder time"
          subtitle={
            settingsLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/2" />
            ) : (
              `Every ${userSettings.hydrationReminderIntervalMinutes ?? 40} mins`
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() =>
            updateSettings.mutate({
              hydrationReminderIntervalMinutes: nextHydrationInterval(
                userSettings?.hydrationReminderIntervalMinutes ?? 40
              ),
            })
          }
        />
      </Section>

      <Section title="Subscription">
        <Row
          icon={<Ticket size={23} color={colors.dark} />}
          title={subscriptionTitle(sub?.plan)}
          subtitle={
            subscription.isLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/2" />
            ) : (
              subscriptionSubtitle
            )
          }
          action={
            <Text color={sub?.entitlement === "premium" ? "success" : "primary"}>
              {sub?.entitlement === "premium" ? "Active" : "Plans"}
            </Text>
          }
          onPress={() => router.push("/(app)/settings/subscription")}
        />
        {subscription.isError ? (
          <SectionError
            title="Could not load subscription"
            message="Plans are still available, but current access may be stale."
            onRetry={() => void subscription.refetch()}
            className="m-lg"
          />
        ) : null}
        {sub?.entitlement === "premium" && sub.priceLabel && renewsAt ? (
          <View className="px-lg py-lg">
            <View className="flex-row items-center justify-between rounded-md bg-primarySoft px-lg py-md">
              <Text>Next charge</Text>
              <Text className="font-semibold">
                {sub.priceLabel} on {renewsAt}
              </Text>
            </View>
            <Pressable
              className="mt-lg min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              onPress={() => router.push("/(app)/settings/subscription")}
            >
              <Text color="error" className="font-semibold">
                Cancel subscription
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Section>

      {biometricAvailable ? (
        <Section title="Security">
          <Row
            icon={<FingerprintSimple size={24} color={colors.dark} />}
            title="Biometric unlock"
            subtitle="Require Face ID, Touch ID, or your passcode to open Thrivo. Stays on this device."
            action={
              <Switch
                value={biometricEnabled}
                disabled={biometricBusy}
                onValueChange={(next) => void onToggleBiometric(next)}
                trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
              />
            }
          />
        </Section>
      ) : null}

      <Section title="Legal">
        <Row
          icon={<ShieldCheck size={23} color={colors.dark} />}
          title="Privacy policy"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}
        />
        <Row
          icon={<FileText size={23} color={colors.dark} />}
          title="Terms of service"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => Linking.openURL(LEGAL_LINKS.terms)}
        />
        <Row
          icon={<X size={23} color={colors.dark} />}
          title="Cancellation policy"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => Linking.openURL(LEGAL_LINKS.cancellation)}
        />
      </Section>

      <Button
        label="Sign out"
        variant="secondary"
        loading={logout.isPending}
        onPress={() => logout.mutate()}
        className="bg-primarySoft"
      />

      {editingTime ? (
        <DateTimePicker
          mode="time"
          display="spinner"
          value={timeToDate(userSettings?.[editingTime])}
          onChange={onTimePicked}
        />
      ) : null}
    </Screen>
  );
}
