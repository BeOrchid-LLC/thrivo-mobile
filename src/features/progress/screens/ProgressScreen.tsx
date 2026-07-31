import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";
import { Lock, TrendDown, Warning } from "phosphor-react-native";
import { router } from "expo-router";
import { queryClient, queryKeys } from "@/api";
import {
  Button,
  BottomSheetShell,
  Card,
  PageHeader,
  Screen,
  SectionError,
  SelectInput,
  SelectSheet,
  SkeletonBlock,
  SkeletonText,
  StepperButton,
  Text,
} from "@/components";
import { isApiError } from "@/api/errors";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { useEntitlement } from "@/hooks/useEntitlement";
import { colors } from "@/theme";
import { formatWeight, localDay, roundTo, weightFromKg, weightToKg, weightUnitFor } from "@/utils";
import type { ChartMetric, ChartPeriod, ChartPoint, ProgressResponse } from "@/contracts";
import { useSettings } from "@/features/settings";
import { useFoodLogDay } from "@/features/food-logging";
import { subscribeTabRootReset } from "@/navigation/tab-root-reset";
import { useAddWeight, useMetricChart, useProgress, useWeightContext } from "../hooks/useProgress";

const metricOptions = [
  { label: "Calories", value: "calories" },
  { label: "Water", value: "water" },
  { label: "Weight", value: "weight" },
  { label: "Protein", value: "protein" },
  { label: "Carbs", value: "carbs" },
  { label: "Fat", value: "fat" },
] as const satisfies readonly { label: string; value: ChartMetric }[];

const periodOptions = [
  { label: "7 days", value: "7d" },
  { label: "14 days", value: "14d" },
  { label: "Month", value: "1m", premiumOnly: true },
  { label: "Quarter", value: "1q", premiumOnly: true },
  { label: "6 months", value: "6m", premiumOnly: true },
  { label: "Year", value: "1y", premiumOnly: true },
  { label: "All", value: "all", premiumOnly: true },
] as const satisfies readonly { label: string; value: ChartPeriod; premiumOnly?: boolean }[];

type ViewMode = "home" | "log-weight";
type ProgressData = ProgressResponse["progress"];

export function ProgressScreen() {
  const day = useCurrentDay();
  const [mode, setMode] = useState<ViewMode>("home");
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(
    () =>
      subscribeTabRootReset("metrics", () => {
        setMode("home");
        setResetVersion((version) => version + 1);
      }),
    []
  );

  return mode === "log-weight" ? (
    <LogWeightScreen day={day} onBack={() => setMode("home")} />
  ) : (
    <ProgressHome key={resetVersion} day={day} onLogWeight={() => setMode("log-weight")} />
  );
}

function ProgressHome({ day, onLogWeight }: { day: string; onLogWeight: () => void }) {
  const [metric, setMetric] = useState<ChartMetric>("weight");
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [metricSelectOpen, setMetricSelectOpen] = useState(false);
  const [periodSelectOpen, setPeriodSelectOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const progress = useProgress(day);
  const chart = useMetricChart(metric, period, day);
  const settings = useSettings();
  const entitlement = useEntitlement();
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const lockPremiumPeriods = !entitlement.isLoading && !entitlement.isPremium;
  const selectedPeriodLabel =
    periodOptions.find((option) => option.value === period)?.label ?? "Select period";
  const selectedMetricLabel =
    metricOptions.find((option) => option.value === metric)?.label ?? "Select metric";
  const selectablePeriodOptions = periodOptions.map((option) => ({
    label: option.label,
    value: option.value,
    locked: Boolean("premiumOnly" in option && option.premiumOnly && lockPremiumPeriods),
  }));
  const premiumRequired =
    chart.isError && isApiError(chart.error) && chart.error.code === "PREMIUM_REQUIRED";
  const data = progress.data?.progress;
  const refresh = () => {
    setRefreshing(true);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.progress(day) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.chart(metric, period, day) }),
    ]).finally(() => setRefreshing(false));
  };

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      style={{ gap: 24, paddingTop: 32, paddingBottom: 16 }}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <PageHeader title="Progress" showBack={false} />
      {data ? (
        <SummaryCards data={data} unitSystem={unitSystem} />
      ) : progress.isLoading ? (
        <SummarySkeleton />
      ) : progress.isError ? (
        <SectionError
          title="Could not load progress"
          message="Charts and logging are still available."
          onRetry={() => void progress.refetch()}
        />
      ) : null}

      <View className="gap-md">
        <Text variant="heading3" color="dark">
          {labelForMetric(metric)} over time
        </Text>
        <SelectInput
          label="Metric"
          value={selectedMetricLabel}
          accessibilityLabel="Select progress metric"
          onPress={() => setMetricSelectOpen(true)}
        />
        <SelectInput
          label="Time period"
          value={selectedPeriodLabel}
          accessibilityLabel="Select time period"
          onPress={() => setPeriodSelectOpen(true)}
        />
        {premiumRequired ? (
          <Card className="gap-sm bg-primarySoft">
            <View className="flex-row items-center gap-sm">
              <Warning size={20} color={colors.primary} />
              <Text variant="heading3" color="primary">
                Unlock longer history
              </Text>
            </View>
            <Text color="muted">Upgrade to view activity records beyond the nearest 14 days.</Text>
          </Card>
        ) : (
          <Card className="gap-sm">
            {chart.isLoading ? (
              <ChartSkeleton />
            ) : chart.isError ? (
              <SectionError
                title="Could not load chart"
                message="Try this metric again."
                onRetry={() => void chart.refetch()}
                className="border-0 p-0"
              />
            ) : (
              <MetricChart
                points={chart.data?.chart.points ?? []}
                metric={chart.data?.chart.metric ?? metric}
                unit={chart.data?.chart.unit}
              />
            )}
          </Card>
        )}
        {data ? (
          <View className="flex-row justify-between">
            <Text color="muted">
              {data.projection.projectedMonth
                ? `At this rate, goal by ${data.projection.projectedMonth}`
                : "Log more weights to project your goal"}
            </Text>
            <Text color="muted">
              {data.projection.weeklyRateKg === null
                ? "Not enough data"
                : `${formatWeight(data.projection.weeklyRateKg, unitSystem, { signed: true })} / week`}
            </Text>
          </View>
        ) : (
          <SkeletonText className="w-2/3" />
        )}
      </View>

      <Button label="Log this week’s weight" onPress={onLogWeight} />
      {data ? (
        <StreakCalendar
          days={data.calendar.days}
          currentStreakDays={data.summary.currentStreakDays}
          longestStreakDays={data.summary.longestStreakDays}
          onSelectDay={setSelectedCalendarDay}
        />
      ) : (
        <CalendarSkeleton />
      )}
      <Button
        label="Log something you ate"
        variant="secondary"
        onPress={() => router.push("/(app)/log")}
      />
      <SelectSheet
        title="Metric"
        options={metricOptions}
        value={metric}
        visible={metricSelectOpen}
        onChange={setMetric}
        onClose={() => setMetricSelectOpen(false)}
      />
      <SelectSheet
        title="Time period"
        options={selectablePeriodOptions}
        value={period}
        visible={periodSelectOpen}
        onChange={setPeriod}
        onLockedPress={() => setPremiumModalOpen(true)}
        onClose={() => setPeriodSelectOpen(false)}
      />
      <PremiumPeriodModal
        visible={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        onSubscribe={() => {
          setPremiumModalOpen(false);
          router.push("/(app)/settings/subscription");
        }}
      />
      <CalendarDayLogSheet
        day={selectedCalendarDay}
        visible={selectedCalendarDay !== null}
        onClose={() => setSelectedCalendarDay(null)}
      />
    </Screen>
  );
}

function PremiumPeriodModal({
  visible,
  onClose,
  onSubscribe,
}: {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/30 px-xl">
        <View className="w-full gap-lg rounded-lg bg-white p-xl">
          <View className="h-[48px] w-[48px] items-center justify-center self-center rounded-full bg-primarySoft">
            <Warning size={26} color={colors.primary} />
          </View>
          <Text variant="body-lg" className="text-center font-semibold">
            Premium required
          </Text>
          <Text variant="body" color="dark" className="text-center">
            You have to be premium to view this option.
          </Text>
          <Button label="View subscription plans" onPress={onSubscribe} />
          <Button label="Not now" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function CalendarDayLogSheet({
  day,
  visible,
  onClose,
}: {
  day: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const queryDay = day ?? localDay();
  const logDay = useFoodLogDay(queryDay, visible && Boolean(day));
  const detail = logDay.data;

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={day ? formatDayTitle(day) : "Food logs"}
      subtitle={
        detail && !detail.isLocked ? (
          <Text variant="caption" color="muted">
            {detail.totals.calories.toLocaleString()} kcal · {Math.round(detail.totals.proteinG)}g
            protein · {detail.entries.length} logged
          </Text>
        ) : null
      }
    >
      {logDay.isLoading ? (
        <View className="gap-md">
          <SkeletonText size="heading" className="w-2/3" />
          <SkeletonText className="w-1/2" />
          <SkeletonText className="w-3/4" />
        </View>
      ) : logDay.isError ? (
        <SectionError
          title="Could not load this day"
          message="Try opening the date again."
          onRetry={() => void logDay.refetch()}
          className="border-0 p-0"
        />
      ) : detail?.isLocked ? (
        <View className="items-center gap-md py-md">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-gray-100">
            <Lock size={26} color={colors.gray[500]} />
          </View>
          <Text variant="heading3" color="dark" className="text-center">
            Subscribe to see older logs
          </Text>
          <Text color="muted" className="text-center">
            Free history includes the most recent {detail.historyLimitDays} days.
          </Text>
          <Button
            label="View plans"
            onPress={() => {
              onClose();
              router.push("/(app)/settings/subscription");
            }}
          />
        </View>
      ) : detail?.isEmptyDay ? (
        <View className="items-center gap-sm py-md">
          <Text variant="heading3" color="dark">
            Nothing logged
          </Text>
          <Text color="muted" className="text-center">
            Food you log for this day will appear here.
          </Text>
        </View>
      ) : detail ? (
        <ScrollView className="max-h-[420px]" showsVerticalScrollIndicator={false}>
          <View className="gap-md pb-sm">
            <View className="flex-row flex-wrap gap-sm">
              <MiniTotal
                label="Calories"
                value={`${detail.totals.calories.toLocaleString()} kcal`}
              />
              <MiniTotal label="Protein" value={`${Math.round(detail.totals.proteinG)}g`} />
              <MiniTotal label="Carbs" value={`${Math.round(detail.totals.carbsG)}g`} />
              <MiniTotal label="Fat" value={`${Math.round(detail.totals.fatG)}g`} />
            </View>
            <View className="gap-md">
              {detail.entries.map((entry) => (
                <View key={entry.id} className="border-b border-gray-200 pb-sm">
                  <View className="flex-row justify-between gap-md">
                    <View className="flex-1">
                      <Text variant="body" color="dark">
                        {entry.name}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatEntryTime(entry.consumedAt)} · {entry.servings.toLocaleString()}{" "}
                        {entry.servingUnit ?? "serving"}
                      </Text>
                    </View>
                    <Text variant="body" color="dark">
                      {entry.nutrients.calories.toLocaleString()} kcal
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </BottomSheetShell>
  );
}

function LogWeightScreen({ day, onBack }: { day: string; onBack: () => void }) {
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

  const save = () => {
    if (!Number.isFinite(numberValue) || numberValue <= 0) return;
    addWeight.mutate(
      { day, weightKg: roundTo(weightToKg(numberValue, unitSystem), 1) },
      { onSuccess: onBack }
    );
  };

  return (
    <Screen scroll style={{ gap: 24 }}>
      <PageHeader title="Log weight" subtitle="What does the scale say today?" onBack={onBack} />

      <View className="gap-sm">
        <Text variant="body" color="dark">
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
            className="min-h-[48px] flex-1 rounded-md bg-gray-100 px-lg text-center font-semibold text-body text-dark"
          />
          <Text color="primary">{weightUnit}</Text>
          <StepperButton
            label="+"
            onPress={() => setWeight(String(roundTo(numberValue + 0.5, 1)))}
          />
        </View>
        <Text color="muted">Tap the number to type the exact weight</Text>
      </View>

      <Card className="gap-md bg-gray-100">
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
          detail="Last 7 days"
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

      <View className="min-h-[44px] flex-row items-center justify-center gap-sm rounded-md bg-primarySoft">
        <TrendDown size={20} color={colors.primary} />
        <Text variant="body" color="primary" className="font-semibold">
          {context.data?.context.projection.weeklyRateKg === null
            ? "Start tracking"
            : `${formatWeight(context.data?.context.projection.weeklyRateKg, unitSystem, {
                signed: true,
              })}  ${statusLabel(context.data?.context.projection.status)}`}
        </Text>
      </View>

      <Button label="Save weight" loading={addWeight.isPending} onPress={save} />
    </Screen>
  );
}

function SummaryCards({
  data,
  unitSystem,
}: {
  data: ProgressData;
  unitSystem: "metric" | "imperial";
}) {
  return (
    <View className="flex-row flex-wrap gap-sm">
      <StatCard
        label="Current weight"
        value={formatWeight(data.summary.currentWeightKg, unitSystem, { absolute: true })}
        detail={
          data.summary.goalGapKg === null
            ? "Set a target to track progress"
            : `${formatWeight(data.summary.goalGapKg, unitSystem, { absolute: true })} toward goal`
        }
        tone="green"
      />
      <StatCard
        label="This week average"
        value={data.summary.currentWeekAverageKcal.toLocaleString()}
        detail="kcal per day"
      />
      <StatCard
        label="Target weight"
        value={formatWeight(data.summary.targetWeightKg, unitSystem, { absolute: true })}
        detail={
          data.summary.goalGapKg === null
            ? "No target set"
            : `${formatWeight(data.summary.goalGapKg, unitSystem, { absolute: true })} to go`
        }
      />
    </View>
  );
}

function SummarySkeleton() {
  return (
    <View className="flex-row flex-wrap gap-sm">
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          className="min-h-[96px] flex-1 basis-[46%] gap-sm rounded-md bg-gray-100 p-md"
        >
          <SkeletonText size="caption" className="w-1/2" />
          <SkeletonText size="heading" className="w-2/3" />
          <SkeletonText className="w-3/4" />
        </View>
      ))}
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View className="h-[180px] justify-between">
      <SkeletonText size="caption" className="w-1/6" />
      <SkeletonBlock className="h-[96px] rounded-md" />
      <View className="flex-row justify-between">
        <SkeletonText size="caption" className="w-1/5" />
        <SkeletonText size="caption" className="w-1/5" />
        <SkeletonText size="caption" className="w-1/5" />
      </View>
    </View>
  );
}

function CalendarSkeleton() {
  return (
    <Card className="gap-md bg-gray-100">
      <View className="flex-row justify-between">
        <SkeletonText size="heading" className="w-1/3" />
        <SkeletonText className="w-1/4" />
      </View>
      <View className="flex-row flex-wrap gap-xs">
        {Array.from({ length: 35 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-[40px] w-[40px]" />
        ))}
      </View>
    </Card>
  );
}

function MetricChart({
  points,
  metric,
  unit,
}: {
  points: ChartPoint[];
  metric: ChartMetric;
  unit?: "kcal" | "ml" | "kg" | "g";
}) {
  const valid = points.filter((point) => point.value !== null) as {
    date: string;
    value: number;
  }[];
  const path = useMemo(() => chartPolyline(valid), [valid]);
  if (valid.length === 0) return <Text color="muted">No chart data yet.</Text>;
  const latest = valid[valid.length - 1];

  return (
    <View className="gap-sm">
      <Text variant="caption" color="muted">
        {latest
          ? `${labelForMetric(metric)} trend, latest ${formatChartValue(latest.value, metric, unit)}`
          : `${labelForMetric(metric)} trend`}
      </Text>
      <Svg width="100%" height={180} viewBox="0 0 320 180">
        <Line x1="0" y1="150" x2="320" y2="150" stroke={colors.gray[300]} strokeWidth="1" />
        <Line x1="0" y1="95" x2="320" y2="95" stroke={colors.gray[200]} strokeWidth="1" />
        <Line x1="0" y1="40" x2="320" y2="40" stroke={colors.gray[200]} strokeWidth="1" />
        <Path d={`${path.area} Z`} fill={colors.primarySoft} />
        <Polyline points={path.line} fill="none" stroke={colors.primary} strokeWidth="3" />
        {path.dots.map((dot) => (
          <Circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="4" fill={colors.primary} />
        ))}
      </Svg>
    </View>
  );
}

function chartPolyline(points: { value: number }[]) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const dots = points.map((point, index) => {
    const x = points.length === 1 ? 160 : (index / (points.length - 1)) * 300 + 10;
    const y = 150 - ((point.value - min) / spread) * 110;
    return { x: roundTo(x, 1), y: roundTo(y, 1) };
  });
  const line = dots.map((dot) => `${dot.x},${dot.y}`).join(" ");
  const area = `M ${dots[0]?.x ?? 0} 150 ${dots.map((dot) => `L ${dot.x} ${dot.y}`).join(" ")} L ${
    dots[dots.length - 1]?.x ?? 320
  } 150`;
  return { line, area, dots };
}

function StreakCalendar({
  days,
  currentStreakDays,
  longestStreakDays,
  onSelectDay,
}: {
  days: { day: string; dayOfMonth: number; logged: boolean; today: boolean; inMonth: boolean }[];
  currentStreakDays: number;
  longestStreakDays: number;
  onSelectDay: (day: string) => void;
}) {
  const rows = chunk(days, 7);

  return (
    <Card className="gap-md rounded-[16px] border-0 bg-gray-100 px-lg py-lg">
      <View className="flex-row justify-between">
        <Text color="dark" className="font-semibold">
          Current streak: {currentStreakDays}
        </Text>
        <Text color="muted">Personal best: {longestStreakDays}</Text>
      </View>
      <View className="flex-row justify-between">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text key={`${day}-${index}`} color="muted" className="w-[36px] text-center">
            {day}
          </Text>
        ))}
      </View>
      <View className="gap-xs">
        {rows.map((row, rowIndex) => (
          <View key={`week-${rowIndex}`} className="flex-row justify-between">
            {row.map((day) => (
              <CalendarDayCell key={day.day} day={day} onPress={() => onSelectDay(day.day)} />
            ))}
          </View>
        ))}
      </View>
      <View className="flex-row justify-center gap-md">
        <Legend color="bg-primary" label="Today" />
        <Legend color="bg-loggedGreen" label="Logged" />
        <Legend color="bg-white" label="Upcoming" />
      </View>
    </Card>
  );
}

function CalendarDayCell({
  day,
  onPress,
}: {
  day: { day: string; dayOfMonth: number; logged: boolean; today: boolean; inMonth: boolean };
  onPress: () => void;
}) {
  const stateClass = day.today
    ? "border-primary bg-primary"
    : day.logged
      ? "border-loggedGreenBorder bg-loggedGreen"
      : "border-gray-200 bg-white";
  const textColor = day.today ? "inverse" : day.logged ? "primary" : "muted";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View logs for ${day.day}`}
      onPress={onPress}
      className={`h-[36px] w-[36px] items-center justify-center rounded-md border ${stateClass} ${
        day.inMonth ? "" : "opacity-60"
      }`}
    >
      <Text color={textColor} className={day.today ? "font-semibold" : ""}>
        {day.dayOfMonth}
      </Text>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "green";
}) {
  return (
    <View
      className={`min-h-[96px] flex-1 basis-[46%] rounded-md p-md ${tone ? "bg-primarySoft" : "bg-gray-100"}`}
    >
      <Text variant="caption" color="dark">
        {label}
      </Text>
      <Text variant="heading2" color="dark">
        {value}
      </Text>
      <Text color="muted">{detail}</Text>
    </View>
  );
}

function MiniTotal({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[62px] flex-1 basis-[46%] rounded-md bg-gray-100 p-sm">
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="body" color="dark" className="font-semibold">
        {value}
      </Text>
    </View>
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
  return (
    <View className="flex-row justify-between gap-md">
      <View>
        <Text variant="body" color="dark">
          {label}
        </Text>
        {detail ? <Text color="muted">{detail}</Text> : null}
      </View>
      <Text variant="body" color={primary ? "primary" : "dark"}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <View className={`h-[18px] w-[18px] rounded-sm border border-gray-200 ${color}`} />
      <Text color="muted">{label}</Text>
    </View>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function labelForMetric(metric: ChartMetric) {
  if (metric === "calories") return "Calories";
  if (metric === "water") return "Water";
  if (metric === "protein") return "Protein";
  if (metric === "carbs") return "Carbs";
  if (metric === "fat") return "Fat";
  return "Weight";
}

function formatChartValue(value: number, metric: ChartMetric, unit?: "kcal" | "ml" | "kg" | "g") {
  const rounded = metric === "weight" ? roundTo(value, 1) : Math.round(value);
  return `${rounded.toLocaleString()} ${unit ?? (metric === "calories" ? "kcal" : metric === "water" ? "ml" : metric === "weight" ? "kg" : "g")}`;
}

function formatDayTitle(day: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

function formatEntryTime(value: string) {
  return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(
    new Date(value)
  );
}

function statusLabel(status: string | undefined) {
  if (status === "on_track") return "On track";
  if (status === "maintaining") return "Maintaining";
  if (status === "off_track") return "Off track";
  return "Keep logging";
}

function yesterdayLabel(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    date
  );
}
