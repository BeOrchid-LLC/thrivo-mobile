import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";
import { ArrowLeft, Minus, Plus, TrendDown, Warning } from "phosphor-react-native";
import { router } from "expo-router";
import { Button, Card, Screen, Segmented, Text } from "@/components";
import { isApiError } from "@/api/errors";
import { colors } from "@/theme";
import { kgToLb, lbToKg, localDay, roundTo } from "@/utils";
import type { ChartMetric, ChartPeriod, ChartPoint } from "@/contracts";
import { useAddWeight, useMetricChart, useProgress, useWeightContext } from "../hooks/useProgress";

const today = localDay();

const metricOptions = [
  { label: "Calories", value: "calories" },
  { label: "Water", value: "water" },
  { label: "Weight", value: "weight" },
] as const satisfies readonly { label: string; value: ChartMetric }[];

const periodOptions = [
  { label: "7 days", value: "7d" },
  { label: "14 days", value: "14d" },
  { label: "Month", value: "1m" },
  { label: "Quarter", value: "1q" },
  { label: "6 months", value: "6m" },
  { label: "Year", value: "1y" },
  { label: "All", value: "all" },
] as const satisfies readonly { label: string; value: ChartPeriod }[];

type ViewMode = "home" | "log-weight";

export function ProgressScreen() {
  const [mode, setMode] = useState<ViewMode>("home");

  return mode === "log-weight" ? (
    <LogWeightScreen onBack={() => setMode("home")} />
  ) : (
    <ProgressHome onLogWeight={() => setMode("log-weight")} />
  );
}

function ProgressHome({ onLogWeight }: { onLogWeight: () => void }) {
  const [metric, setMetric] = useState<ChartMetric>("weight");
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const progress = useProgress(today);
  const chart = useMetricChart(metric, period, today);
  const premiumRequired =
    chart.isError && isApiError(chart.error) && chart.error.code === "PREMIUM_REQUIRED";
  const data = progress.data?.progress;

  return (
    <Screen scroll style={{ gap: 24 }}>
      <Text variant="heading2" color="dark">
        Progress
      </Text>
      {progress.isLoading ? <Text color="muted">Loading progress...</Text> : null}
      {progress.isError ? <Text color="error">Could not load progress.</Text> : null}
      {data ? (
        <>
          <View className="flex-row flex-wrap gap-sm">
            <StatCard
              label="Current weight"
              value={formatWeight(data.summary.currentWeightKg)}
              detail={
                data.summary.goalGapKg === null
                  ? "Set a target to track progress"
                  : `${formatWeight(data.summary.goalGapKg)} toward goal`
              }
              tone="green"
            />
            <StatCard
              label="Logging streak"
              value={`${data.summary.currentStreakDays} days`}
              detail={`Personal best: ${data.summary.longestStreakDays}`}
              tone="green"
            />
            <StatCard
              label="This week average"
              value={data.summary.currentWeekAverageKcal.toLocaleString()}
              detail="kcal per day"
            />
            <StatCard
              label="Target weight"
              value={formatWeight(data.summary.targetWeightKg)}
              detail={
                data.summary.goalGapKg === null
                  ? "No target set"
                  : `${formatWeight(data.summary.goalGapKg)} to go`
              }
            />
          </View>

          <View className="gap-md">
            <Text variant="heading3" color="dark">
              {labelForMetric(metric)} over time
            </Text>
            <Segmented options={metricOptions} value={metric} onChange={setMetric} />
            <View className="flex-row flex-wrap gap-sm">
              {periodOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === period }}
                  onPress={() => setPeriod(option.value)}
                  className={`min-h-[38px] items-center justify-center rounded-sm px-md ${
                    option.value === period ? "bg-primary" : "bg-gray-100"
                  }`}
                >
                  <Text variant="caption" color={option.value === period ? "inverse" : "muted"}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {premiumRequired ? (
              <Card className="gap-sm bg-primarySoft">
                <View className="flex-row items-center gap-sm">
                  <Warning size={20} color={colors.primary} />
                  <Text variant="heading3" color="primary">
                    Unlock longer history
                  </Text>
                </View>
                <Text color="muted">
                  Upgrade to view activity records beyond the nearest 14 days.
                </Text>
              </Card>
            ) : (
              <Card className="gap-sm">
                {chart.isLoading ? (
                  <Text color="muted">Loading chart...</Text>
                ) : chart.isError ? (
                  <Text color="error">Could not load chart.</Text>
                ) : (
                  <MetricChart points={chart.data?.chart.points ?? []} />
                )}
              </Card>
            )}
            <View className="flex-row justify-between">
              <Text color="muted">
                {data.projection.projectedMonth
                  ? `At this rate, goal by ${data.projection.projectedMonth}`
                  : "Log more weights to project your goal"}
              </Text>
              <Text color="muted">
                {data.projection.weeklyRateKg === null
                  ? "Not enough data"
                  : `${formatWeight(data.projection.weeklyRateKg)} / week`}
              </Text>
            </View>
          </View>

          <Button label="Log this week’s weight" onPress={onLogWeight} />
          <StreakCalendar days={data.calendar.days} />
          <Button
            label="Log something you ate"
            variant="secondary"
            onPress={() => router.push("/(app)/log")}
          />
        </>
      ) : null}
    </Screen>
  );
}

function LogWeightScreen({ onBack }: { onBack: () => void }) {
  const context = useWeightContext(today);
  const addWeight = useAddWeight(today);
  const currentLb = context.data?.context.currentWeightKg
    ? roundTo(kgToLb(context.data.context.currentWeightKg), 1)
    : 178;
  const [weight, setWeight] = useState(String(currentLb));
  const numberValue = Number.parseFloat(weight);

  const save = () => {
    if (!Number.isFinite(numberValue) || numberValue <= 0) return;
    addWeight.mutate(
      { day: today, weightKg: roundTo(lbToKg(numberValue), 1) },
      { onSuccess: onBack }
    );
  };

  return (
    <Screen scroll style={{ gap: 24 }}>
      <View className="flex-row items-center gap-md">
        <Pressable accessibilityRole="button" onPress={onBack}>
          <ArrowLeft size={24} color={colors.dark} />
        </Pressable>
        <View>
          <Text variant="heading2" color="dark">
            Log weight
          </Text>
          <Text color="muted">What does the scale say today?</Text>
        </View>
      </View>

      <View className="gap-sm">
        <Text variant="body" color="dark">
          Today’s weight
        </Text>
        <View className="flex-row items-center gap-md">
          <Stepper
            label="-"
            onPress={() => setWeight(String(roundTo(Math.max(numberValue - 0.5, 1), 1)))}
          />
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            className="min-h-[48px] flex-1 rounded-md bg-gray-100 px-lg text-center font-semibold text-[16px] text-dark"
          />
          <Text color="primary">lbs</Text>
          <Stepper label="+" onPress={() => setWeight(String(roundTo(numberValue + 0.5, 1)))} />
        </View>
        <Text color="muted">Tap the number to type the exact weight</Text>
      </View>

      <Card className="gap-md bg-gray-100">
        <ComparisonRow
          label="Yesterday"
          detail={yesterdayLabel(today)}
          value={formatWeight(context.data?.context.yesterdayWeightKg)}
        />
        <Divider />
        <ComparisonRow
          label="7-day average"
          detail="Last 7 days"
          value={formatWeight(context.data?.context.sevenDayAverageKg)}
        />
        <Divider />
        <ComparisonRow
          label="Goal weight"
          value={formatWeight(context.data?.context.targetWeightKg)}
          primary
        />
      </Card>

      <View className="min-h-[44px] flex-row items-center justify-center gap-sm rounded-md bg-primarySoft">
        <TrendDown size={20} color={colors.primary} />
        <Text variant="body" color="primary" className="font-semibold">
          {context.data?.context.projection.weeklyRateKg === null
            ? "Start tracking"
            : `${formatWeight(context.data?.context.projection.weeklyRateKg)}  ${statusLabel(
                context.data?.context.projection.status
              )}`}
        </Text>
      </View>

      <Button label="Save weight" loading={addWeight.isPending} onPress={save} />
    </Screen>
  );
}

function MetricChart({ points }: { points: ChartPoint[] }) {
  const valid = points.filter((point) => point.value !== null) as {
    date: string;
    value: number;
  }[];
  const path = useMemo(() => chartPolyline(valid), [valid]);
  if (valid.length === 0) return <Text color="muted">No chart data yet.</Text>;

  return (
    <View className="gap-sm">
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
}: {
  days: { day: string; dayOfMonth: number; logged: boolean; today: boolean; inMonth: boolean }[];
}) {
  return (
    <Card className="gap-md bg-gray-100">
      <View className="flex-row justify-between">
        <Text variant="heading3" color="dark">
          Food log streak
        </Text>
        <Text color="muted">Personal best</Text>
      </View>
      <View className="flex-row justify-between">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text key={`${day}-${index}`} color="muted" className="w-[40px] text-center">
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-xs">
        {days.map((day) => (
          <View
            key={day.day}
            className={`h-[40px] w-[40px] items-center justify-center rounded-sm border border-gray-200 ${
              day.today ? "bg-primary" : day.logged ? "bg-primarySoft" : "bg-white"
            } ${day.inMonth ? "" : "opacity-60"}`}
          >
            <Text color={day.today ? "inverse" : day.logged ? "primary" : "muted"}>
              {day.dayOfMonth}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row justify-center gap-md">
        <Legend color="bg-primary" label="Today" />
        <Legend color="bg-primarySoft" label="Logged" />
        <Legend color="bg-white" label="Upcoming" />
      </View>
    </Card>
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

function Stepper({ label, onPress }: { label: "-" | "+"; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-[28px] w-[28px] items-center justify-center rounded-sm border border-gray-200 bg-primarySoft"
    >
      {label === "-" ? (
        <Minus size={16} color={colors.primary} />
      ) : (
        <Plus size={16} color={colors.primary} />
      )}
    </Pressable>
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
      <View className={`rounded-xs h-[18px] w-[18px] border border-gray-200 ${color}`} />
      <Text color="muted">{label}</Text>
    </View>
  );
}

function labelForMetric(metric: ChartMetric) {
  if (metric === "calories") return "Calories";
  if (metric === "water") return "Water";
  return "Weight";
}

function formatWeight(kg: number | null | undefined) {
  if (kg === null || kg === undefined) return "-- lbs";
  return `${roundTo(kgToLb(Math.abs(kg)), 1)} lbs`;
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
