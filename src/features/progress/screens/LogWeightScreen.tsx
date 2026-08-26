import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { TrendDown } from "phosphor-react-native";
import {
  Button,
  Card,
  PageHeader,
  Screen,
  StepperButton,
  Text,
  type TextColor,
} from "@/components";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { colors, fontFamilies, inputFont, rhythm } from "@/theme";
import { formatWeight, roundTo, weightFromKg, weightToKg, weightUnitFor } from "@/utils";
import { useSettings } from "@/features/settings";
import { useAddWeight, useWeightContext } from "../hooks/useProgress";

/**
 * Lives in the `(app)` stack rather than inside the Progress tab, so it covers
 * the tab bar the way the frame draws it — the weigh-in is a task you finish and
 * back out of, not a place you tab away from mid-entry. `Save weight` is pinned
 * to the bottom for the same reason: it stays put while the comparisons scroll.
 */
export function LogWeightScreen() {
  const day = useCurrentDay();
  const context = useWeightContext(day);
  const addWeight = useAddWeight(day);
  const settings = useSettings();
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const weightUnit = weightUnitFor(unitSystem);
  const currentWeight = context.data?.context.currentWeightKg
    ? roundTo(weightFromKg(context.data.context.currentWeightKg, unitSystem), 1)
    : unitSystem === "imperial"
      ? 178
      : 80.7;
  const [weight, setWeight] = useState(String(currentWeight));
  const numberValue = Number.parseFloat(weight);
  const weeklyRateKg = context.data?.context.projection.weeklyRateKg;

  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(tabs)/metrics");
  };

  const save = () => {
    if (!Number.isFinite(numberValue) || numberValue <= 0) return;
    addWeight.mutate(
      { day, weightKg: roundTo(weightToKg(numberValue, unitSystem), 1) },
      { onSuccess: back }
    );
  };

  return (
    <Screen
      scroll
      header={
        <PageHeader title="Log weight" subtitle="What does the scale say today?" onBack={back} />
      }
      footer={<Button label="Save weight" loading={addWeight.isPending} onPress={save} />}
      style={{ gap: rhythm.pageGap, paddingTop: 0, paddingBottom: rhythm.pageBottom }}
    >
      <View className="gap-sm">
        <Text variant="body" color="dark" className="font-semibold">
          Today’s weight
        </Text>
        <View className="flex-row items-center gap-md">
          <StepperButton
            label="-"
            onPress={() => setWeight(String(roundTo(Math.max(numberValue - 0.5, 1), 1)))}
          />
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            accessibilityLabel="Today’s weight"
            className="min-h-control flex-1 rounded-md border border-gray-200 bg-light px-lg text-center"
            style={[inputFont("body"), { color: colors.dark, fontFamily: fontFamilies.semiBold }]}
          />
          <Text color="primary">{weightUnit}</Text>
          <StepperButton
            label="+"
            onPress={() => setWeight(String(roundTo(numberValue + 0.5, 1)))}
          />
        </View>
        <Text variant="body-sm" color="muted">
          Tap the number to type the exact weight
        </Text>
      </View>

      <Card className="gap-md bg-light" style={{ borderWidth: 0 }}>
        <ComparisonRow
          label="Yesterday"
          detail={yesterdayLabel(day)}
          value={formatWeight(context.data?.context.yesterdayWeightKg, unitSystem, {
            absolute: true,
          })}
        />
        <Divider />
        <ComparisonRow
          label="7-day average"
          detail={sevenDayRangeLabel(day)}
          value={formatWeight(context.data?.context.sevenDayAverageKg, unitSystem, {
            absolute: true,
          })}
        />
        <Divider />
        <ComparisonRow
          label="Goal weight"
          value={formatWeight(context.data?.context.targetWeightKg, unitSystem, {
            absolute: true,
          })}
          primary
        />
      </Card>

      <View className="min-h-touchTarget flex-row items-center justify-center gap-sm rounded-md bg-primarySoft px-lg">
        <TrendDown size={20} color={colors.primary} />
        {weeklyRateKg === null || weeklyRateKg === undefined ? (
          <Text variant="body" color="primary" className="font-semibold">
            Start tracking
          </Text>
        ) : (
          <Text variant="body" color="primary">
            <Text variant="body" color="primary" className="font-semibold">
              {formatWeight(weeklyRateKg, unitSystem, { signed: true })}
            </Text>{" "}
            {statusLabel(context.data?.context.projection.status)}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function ComparisonRow({
  label,
  detail,
  value,
  primary,
}: {
  label: string;
  detail?: string;
  value: string;
  primary?: boolean;
}) {
  const valueColor: TextColor = primary ? "primary" : "dark";

  return (
    <View className="flex-row items-center justify-between gap-md">
      <View>
        <Text variant="body" color="dark">
          {label}
        </Text>
        {detail ? (
          <Text variant="body-sm" color="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="body" color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}

function statusLabel(status: string | undefined) {
  if (status === "on_track") return "On track";
  if (status === "maintaining") return "Maintaining";
  if (status === "off_track") return "Off track";
  return "Keep logging";
}

function utcDate(day: string, offsetDays = 0) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

function yesterdayLabel(day: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(utcDate(day, -1));
}

/**
 * The seven days the average covers — yesterday back six more. The month is
 * repeated only when the window straddles one ("June 28 - July 4").
 */
function sevenDayRangeLabel(day: string) {
  const from = utcDate(day, -7);
  const to = utcDate(day, -1);
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" });
  const dayOfMonth = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" });
  const sameMonth = month.format(from) === month.format(to);
  const start = `${month.format(from)} ${dayOfMonth.format(from)}`;
  const end = sameMonth ? dayOfMonth.format(to) : `${month.format(to)} ${dayOfMonth.format(to)}`;
  return `${start} - ${end}`;
}
