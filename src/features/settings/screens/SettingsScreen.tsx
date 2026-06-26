import { useMemo, type ReactNode } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  CaretRight,
  Clock,
  FileText,
  Ruler,
  ShieldCheck,
  Ticket,
  X,
} from "phosphor-react-native";
import { Button, Screen, Text } from "@/components";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useMe } from "@/features/profile";
import { useSubscription } from "@/features/subscription";
import { colors } from "@/theme";
import { useSettings } from "../hooks/useSettings";
import { useUpdateSettings } from "../hooks/useUpdateSettings";

const LEGAL_LINKS = {
  privacy: "https://www.traxq.com/privacy",
  terms: "https://www.traxq.com/terms",
  cancellation: "https://www.traxq.com/terms",
};

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

function nextReminderTime(current: string) {
  const options = ["08:00", "09:00", "12:00", "18:00", "20:00"];
  const normalized = current.slice(0, 5);
  const index = options.indexOf(normalized);
  return options[(index + 1) % options.length] ?? "08:00";
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
  subtitle?: string;
  action?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View className="min-h-[72px] flex-row items-center gap-md border-b border-gray-200 px-lg py-md">
      <View className={`${iconWide ? "w-[64px]" : "w-[32px]"} items-center`}>{icon}</View>
      <View className="flex-1">
        <Text className="text-[16px] font-semibold">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="muted" className="mt-xxs text-[13px]">
            {subtitle}
          </Text>
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

  const user = profile.data;
  const userSettings = settings.data;
  const sub = subscription.data?.subscription;
  const renewsAt = shortDate(sub?.renewsAt ?? sub?.accessEndsAt);

  const subscriptionSubtitle = useMemo(() => {
    if (!sub || sub.status === "none" || sub.status === "expired") return "Choose a plan";
    if (sub.cancelAtPeriodEnd && renewsAt) return `Access until ${renewsAt}`;
    if (renewsAt) return `Active - Renews ${renewsAt}`;
    return "Active";
  }, [renewsAt, sub]);

  return (
    <Screen scroll backgroundColor={colors.white} style={{ gap: 26, paddingBottom: 120 }}>
      <Text variant="heading2">Settings</Text>

      <Section title="Profile">
        <Row
          iconWide
          icon={
            <View className="h-[64px] w-[64px] items-center justify-center rounded-full bg-primarySoft">
              <Text className="text-[20px] font-semibold">{initials(user?.name)}</Text>
            </View>
          }
          title={user?.name || "Your profile"}
          subtitle={`${user?.email ?? "Email"}, weight, goal`}
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
          subtitle={userSettings?.unitSystem === "imperial" ? "lb / in" : "kg / cm"}
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Edit</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() =>
            updateSettings.mutate({
              unitSystem: userSettings?.unitSystem === "imperial" ? "metric" : "imperial",
            })
          }
        />
      </Section>

      <Section title="Notifications">
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Daily food log reminder"
          action={
            <Switch
              value={Boolean(userSettings?.dailyFoodLogReminderEnabled)}
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
          subtitle={formatTime(userSettings?.dailyFoodLogReminderTime)}
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() =>
            updateSettings.mutate({
              dailyFoodLogReminderTime: nextReminderTime(
                userSettings?.dailyFoodLogReminderTime ?? "08:00"
              ),
            })
          }
        />
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Weight check"
          action={
            <Switch
              value={Boolean(userSettings?.weightCheckReminderEnabled)}
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
          subtitle={`Weekly, Friday ${formatTime(userSettings?.weightCheckReminderTime)}`}
          action={
            <View className="flex-row items-center gap-xs">
              <Text color="muted">Change</Text>
              <CaretRight size={18} color={colors.gray[500]} />
            </View>
          }
          onPress={() =>
            updateSettings.mutate({
              weightCheckReminderTime: nextReminderTime(
                userSettings?.weightCheckReminderTime ?? "09:00"
              ),
            })
          }
        />
        <Row
          icon={<Clock size={24} color={colors.dark} />}
          title="Hydration"
          action={
            <Switch
              value={Boolean(userSettings?.hydrationReminderEnabled)}
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
          subtitle={`Every ${userSettings?.hydrationReminderIntervalMinutes ?? 40} mins`}
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
          subtitle={subscriptionSubtitle}
          action={
            <Text color={sub?.entitlement === "premium" ? "success" : "primary"}>
              {sub?.entitlement === "premium" ? "Active" : "Plans"}
            </Text>
          }
          onPress={() => router.push("/(app)/settings/subscription")}
        />
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
    </Screen>
  );
}
