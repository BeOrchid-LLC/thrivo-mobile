import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  Bell,
  CaretRight,
  ChatText,
  CheckCircle,
  Clock,
  FileText,
  FingerprintSimple,
  Ruler,
  ShieldCheck,
  Trash,
  X,
} from "phosphor-react-native";
import {
  Button,
  PageHeader,
  Screen,
  SelectSheet,
  SkeletonText,
  Text,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { queryClient, queryKeys } from "@/api";
import { LEGAL_LINKS } from "@/config/links";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { analytics } from "@/lib";
import { useMe } from "@/features/profile";
import { productForPlan, useOfferings, useSubscription } from "@/features/subscription";
import { CancelSubscriptionDialogs } from "@/features/subscription/components/CancelSubscriptionDialogs";
import { authenticateBiometric, isBiometricAvailable } from "@/lib/biometric";
import { useBiometricAuthEnabled, usePreferencesActions } from "@/stores";
import { colors, rhythm } from "@/theme";
import { formatShortDate } from "@/utils";
import { getOnboardingProgress } from "@/features/onboarding/utils/progress";
import { useSettings } from "../hooks/useSettings";
import { useUpdateSettings } from "../hooks/useUpdateSettings";

function initials(name?: string | null) {
  const parts = (name || "Thrivo User").trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "T"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

type UnitSystem = "metric" | "imperial";

const UNIT_OPTIONS: readonly { label: string; value: UnitSystem }[] = [
  { label: "Metric (kg / cm)", value: "metric" },
  { label: "Imperial (lb / in)", value: "imperial" },
];

const HYDRATION_OPTIONS = [30, 40, 60, 90, 120].map((value) => ({
  label: `Every ${value} mins`,
  value,
}));

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

/** The daily schedule as one line: "8:00 AM, 12:30 PM". */
function formatTimes(times?: string[] | null) {
  if (!times?.length) return "Not set yet";
  return times.map((time) => formatTime(time)).join(", ");
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
        <Text variant="body" className="font-semibold">
          {title}
        </Text>
        {typeof subtitle === "string" ? (
          <Text variant="caption" color="muted" className="mt-xxs">
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
      <Text variant="body">{title}</Text>
      <View className="overflow-hidden rounded-lg border border-gray-200 bg-white">{children}</View>
    </View>
  );
}

export function SettingsScreen() {
  const profile = useMe();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const subscription = useSubscription();
  const offerings = useOfferings();
  const logout = useLogout();

  const biometricEnabled = useBiometricAuthEnabled();
  const { setBiometricAuthEnabled } = usePreferencesActions();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Which reminder-time field the native time picker is currently editing.
  const [editingTime, setEditingTime] = useState<"weightCheckReminderTime" | null>(null);
  const [editingSelect, setEditingSelect] = useState<"units" | "hydration" | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const renewsAt = formatShortDate(sub?.renewsAt ?? sub?.accessEndsAt);
  // The charge date is the renewal specifically — an access-end date is when
  // premium stops, which is the opposite of a date money moves on.
  const nextChargeOn = formatShortDate(sub?.renewsAt);
  // `subscription.priceLabel` is deprecated and comes back null — store-localised
  // pricing lives in the RevenueCat packages, the same source the paywall uses.
  const plan = sub?.plan ?? "monthly";
  const priceLabel =
    productForPlan(offerings.data, plan)?.priceLabel ??
    sub?.plans?.find((p) => p.plan === plan)?.priceLabel ??
    sub?.priceLabel ??
    null;

  const onTimePicked = (event: TimePickerEvent, date?: Date) => {
    const field = editingTime;
    setEditingTime(null); // Android dialog is one-shot; iOS spinner closes too.
    if (event.type !== "set" || !date || !field) return;
    // Dismissing the picker is not a reminder change; only a confirmed time is.
    analytics.track("thrivo.reminder_set", { reminder: field });
    updateSettings.mutate({ [field]: dateToTime(date) });
  };

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.me() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.me() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me() }),
    ]).finally(() => setRefreshing(false));
  };

  const subscriptionSubtitle = useMemo(() => {
    if (!sub || sub.status === "none" || sub.status === "expired") return "Choose a plan";
    if (sub.cancelAtPeriodEnd && renewsAt) return `Access until ${renewsAt}`;
    if (renewsAt) return `Active - Renews ${renewsAt}`;
    return "Active";
  }, [renewsAt, sub]);
  const settingsLoading = settings.isLoading || !userSettings;

  const isPremium = sub?.entitlement === "premium";

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      backgroundColor={colors.white}
      style={{ gap: rhythm.pageGap, paddingTop: rhythm.pageTop, paddingBottom: rhythm.pageTop }}
      header={<PageHeader title="Settings" showBack={false} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Section title="Profile">
        <Row
          iconWide
          icon={
            <View className="h-avatar w-avatar items-center justify-center overflow-hidden rounded-full bg-primarySoft">
              {user?.image ? (
                <Image
                  accessibilityLabel="Profile photo"
                  source={{ uri: user.image }}
                  style={{ width: 64, height: 64 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <Text variant="heading3">{initials(user?.name)}</Text>
              )}
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
          onPress={() => router.push("/(app)/personal-info")}
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
          onPress={settingsLoading ? undefined : () => setEditingSelect("units")}
        />
        {profile.isLoading ? (
          <Row
            icon={<SkeletonText size="body" className="w-6" />}
            title="Onboarding"
            subtitle={<SkeletonText size="caption" className="w-1/2" />}
          />
        ) : user?.isOnboarded ? (
          <Row
            icon={<CheckCircle size={24} weight="fill" color={colors.successBright} />}
            title="Onboarding complete"
            subtitle="Review or change any setup answer"
            action={
              <View className="flex-row items-center gap-xs">
                <Text color="muted">Edit</Text>
                <CaretRight size={18} color={colors.gray[500]} />
              </View>
            }
            onPress={() => router.push("/(app)/onboarding-setup")}
          />
        ) : (
          <Row
            icon={<CheckCircle size={24} color={colors.gray[400]} />}
            title="Onboarding"
            subtitle={`${getOnboardingProgress(user!).completedSteps} of ${getOnboardingProgress(user!).totalSteps} complete`}
            action={<CaretRight size={18} color={colors.gray[500]} />}
            onPress={() => router.push("/(app)/onboarding-setup")}
          />
        )}
        <Row
          icon={<Ruler size={24} color={colors.dark} />}
          title="Targets and activity"
          subtitle="Activity level and calorie target"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => router.push("/(app)/settings-edit/target")}
        />
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Meal reminders"
          subtitle="Reminder times and timezone"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => router.push("/(app)/food-log-reminder")}
        />
      </Section>

      <Section title="Notifications">
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Daily food log reminder"
          subtitle="Push reminders to record what you've eaten"
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
          title="Reminder times"
          subtitle={
            profile.isLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/2" />
            ) : (
              formatTimes(user?.notifyTimes)
            )
          }
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() => router.push("/(app)/food-log-reminder")}
        />
        <Row
          icon={<Bell size={22} color={colors.dark} />}
          title="Psychology tips"
          subtitle="Daily tips in push notifications"
          action={
            <Switch
              accessibilityLabel="Psychology tips"
              value={Boolean(userSettings?.psychologyTipPushEnabled)}
              disabled={settingsLoading}
              onValueChange={(psychologyTipPushEnabled) =>
                updateSettings.mutate({ psychologyTipPushEnabled })
              }
              trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
            />
          }
        />
        <Row
          icon={<Bell size={22} color={colors.dark} />}
          title="Weekly review email"
          subtitle="Your previous week, Sundays around 9:00 AM"
          action={
            <Switch
              value={Boolean(
                userSettings?.weeklyReviewEmailEnabled ?? userSettings?.emailFoodLogReminderEnabled
              )}
              disabled={settingsLoading}
              onValueChange={(weeklyReviewEmailEnabled) =>
                updateSettings.mutate({ weeklyReviewEmailEnabled })
              }
              trackColor={{ true: colors.primaryBright, false: colors.gray[300] }}
            />
          }
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
          onPress={settingsLoading ? undefined : () => setEditingSelect("hydration")}
        />
      </Section>

      <Section title="Subscription">
        <Row
          icon={<ChatText size={24} color={colors.dark} />}
          title={subscriptionTitle(sub?.plan)}
          subtitle={
            subscription.isLoading ? (
              <SkeletonText size="caption" className="mt-xxs w-1/2" />
            ) : (
              subscriptionSubtitle
            )
          }
          action={
            <Text color={isPremium ? "successBright" : "primary"} className="font-semibold">
              {isPremium ? "Active" : "Plans"}
            </Text>
          }
          onPress={() => router.push("/(app)/subscription")}
        />
        {isPremium && !sub.cancelAtPeriodEnd ? (
          <View className="px-lg py-lg">
            {nextChargeOn ? (
              <View className="flex-row items-center justify-between rounded-md bg-primarySoft px-lg py-md">
                <Text>Next charge</Text>
                <Text className="font-semibold">
                  {priceLabel ? `${priceLabel} on ${nextChargeOn}` : nextChargeOn}
                </Text>
              </View>
            ) : null}
            <Pressable
              className={
                nextChargeOn
                  ? "mt-lg min-h-touchTarget items-center justify-center"
                  : "min-h-touchTarget items-center justify-center"
              }
              accessibilityRole="button"
              onPress={() => setConfirmCancelOpen(true)}
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
            subtitle="Show device unlock on the welcome screen when this device has a saved login. Stays on this device."
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

      <Section title="Account">
        <Row
          icon={<Trash size={23} color={colors.error} />}
          title="Delete account"
          subtitle="Permanently remove your account and all of your data"
          action={<CaretRight size={18} color={colors.gray[500]} />}
          onPress={() => router.push("/(app)/(tabs)/settings/delete-account")}
        />
      </Section>

      <Button
        label="Sign out"
        variant="secondary"
        loading={logout.isPending}
        onPress={() => logout.mutate()}
        className="bg-primarySoft"
      />

      <CancelSubscriptionDialogs
        visible={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        accessEndsAt={sub?.accessEndsAt}
        renewsAt={sub?.renewsAt}
      />

      {editingTime ? (
        <TimePicker value={timeToDate(userSettings?.[editingTime])} onChange={onTimePicked} />
      ) : null}

      <SelectSheet
        title="Units"
        options={UNIT_OPTIONS}
        value={(userSettings?.unitSystem ?? "metric") as UnitSystem}
        visible={editingSelect === "units"}
        disabled={settingsLoading}
        onChange={(unitSystem) => updateSettings.mutate({ unitSystem })}
        onClose={() => setEditingSelect(null)}
      />
      <SelectSheet
        title="Hydration interval"
        options={HYDRATION_OPTIONS}
        value={userSettings?.hydrationReminderIntervalMinutes ?? 40}
        visible={editingSelect === "hydration"}
        disabled={settingsLoading}
        onChange={(hydrationReminderIntervalMinutes) =>
          updateSettings.mutate({ hydrationReminderIntervalMinutes })
        }
        onClose={() => setEditingSelect(null)}
      />
    </Screen>
  );
}
