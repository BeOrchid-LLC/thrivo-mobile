import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { CaretDown, Lock, Warning } from "phosphor-react-native";
import { router } from "expo-router";
import { queryClient, queryKeys } from "@/api";
import {
  Button,
  BottomSheetShell,
  Card,
  PageHeader,
  PremiumGate,
  Screen,
  SectionError,
  SelectSheet,
  SkeletonBlock,
  SkeletonText,
  Text,
} from "@/components";
import { isApiError } from "@/api/errors";
import { useCountUp } from "@/hooks/useCountUp";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { useEntitlement } from "@/hooks/useEntitlement";
import { colors, fontFamilies } from "@/theme";
import {
  formatWeight,
  localDay,
  roundTo,
  waterFromMl,
  waterUnitFor,
  weightFromKg,
  weightUnitFor,
} from "@/utils";
import type { ChartMetric, ChartPeriod, ChartPoint, ProgressResponse } from "@/contracts";
import { useSettings } from "@/features/settings";
import { useFoodLogDay } from "@/features/food-logging";
import { subscribeTabRootReset } from "@/navigation/tab-root-reset";
import { useMetricChart, useProgress } from "../hooks/useProgress";

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

type ProgressData = ProgressResponse["progress"];

export function ProgressScreen() {
  const day = useCurrentDay();
  const [resetVersion, setResetVersion] = useState(0);

  // Re-pressing the Progress tab puts the chart back on its default metric and
  // period; remounting is what clears that state.
  useEffect(
    () => subscribeTabRootReset("metrics", () => setResetVersion((version) => version + 1)),
    []
  );

  return <ProgressHome key={resetVersion} day={day} />;
}

function ProgressHome({ day }: { day: string }) {
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
  const chartUnitLabel = unitLabelFor(metric, unitSystem);
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
      rhythm="default"
      header={<PageHeader title="Progress" showBack={false} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
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

      <View className="gap-sm">
        {/* The frame draws the chart controls as the heading and the caption
            under it, not as two labelled fields — so the metric picker hangs off
            the heading and the period picker off the caption. */}
        {lockPremiumPeriods ? null : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select progress metric"
              accessibilityValue={{ text: selectedMetricLabel }}
              className="flex-row items-center gap-xs self-start"
              hitSlop={6}
              onPress={() => setMetricSelectOpen(true)}
            >
              <Text variant="heading3" color="dark">
                {labelForMetric(metric)} over time
              </Text>
              <CaretDown size={14} weight="bold" color={colors.gray[500]} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select time period"
              accessibilityValue={{ text: selectedPeriodLabel }}
              className="flex-row items-center gap-xs self-start"
              hitSlop={8}
              onPress={() => setPeriodSelectOpen(true)}
            >
              <Text variant="body-sm" color="muted">
                {selectedPeriodLabel} : {chartUnitLabel}
              </Text>
              <CaretDown size={12} weight="bold" color={colors.gray[500]} />
            </Pressable>
          </>
        )}
        {lockPremiumPeriods ? (
          // Charts are premium outright, not premium-past-a-window. A partial
          // series is still the feature, so the whole display is gated rather
          // than trimmed — the blurred chart behind the card is the teaser.
          <PremiumGate
            title="Subscribe to see your progress charts"
            subtitle="Track calories, water, weight and macros over time."
            onViewPlans={() => router.push("/(app)/subscription")}
          >
            <ChartSkeleton />
          </PremiumGate>
        ) : premiumRequired ? (
          <Card className="mt-sm gap-sm bg-primarySoft" style={{ borderWidth: 0 }}>
            <View className="flex-row items-center gap-sm">
              <Warning size={20} color={colors.primary} />
              <Text variant="heading3" color="primary">
                Unlock longer history
              </Text>
            </View>
            <Text color="muted">Upgrade to view activity records beyond the nearest 14 days.</Text>
          </Card>
        ) : chart.isLoading ? (
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
            // Remounting on metric/period change replays the draw-on for
            // the new series; without it the line would just swap in place.
            key={`${metric}-${period}`}
            points={chart.data?.chart.points ?? []}
            metric={chart.data?.chart.metric ?? metric}
            unitSystem={unitSystem}
            unitLabel={chartUnitLabel}
            axisLabel={axisLabelFor(period)}
          />
        )}
        {data ? (
          <View className="mt-xs flex-row items-center justify-between gap-md">
            <Text variant="body-sm" color="muted" className="flex-1">
              {data.projection.projectedMonth ? (
                <>
                  At this rate, goal by{" "}
                  <Text variant="body-sm" color="primary">
                    {data.projection.projectedMonth}
                  </Text>
                </>
              ) : (
                "Log more weights to project your goal"
              )}
            </Text>
            <Text variant="body-sm" color="muted" className="shrink-0">
              {data.projection.weeklyRateKg === null
                ? "Not enough data"
                : `~ ${formatWeight(data.projection.weeklyRateKg, unitSystem, {
                    absolute: true,
                  })} / week`}
            </Text>
          </View>
        ) : (
          <SkeletonText className="w-2/3" />
        )}
      </View>

      <Button
        label="Log this week’s weight"
        className="rounded-pill"
        onPress={() => router.push("/(app)/log-weight")}
      />
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
        // The frame draws this one as a soft-green pill rather than the grey
        // secondary: a green label on the primary tint.
        variant="ghost"
        className="bg-primarySoft"
        onPress={() => router.push("/(app)/(tabs)/log")}
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
          router.push("/(app)/subscription");
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
          <View className="h-badge w-badge items-center justify-center self-center rounded-full bg-primarySoft">
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
          <View className="h-badgeLg w-badgeLg items-center justify-center rounded-full bg-gray-100">
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
              router.push("/(app)/subscription");
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
            : // The frame reads "-7 lbs toward goal" — progress already made —
              // but the summary only carries the remaining gap, so state that.
              `${formatWeight(data.summary.goalGapKg, unitSystem, { absolute: true })} toward goal`
        }
        tone="green"
      />
      <StatCard
        label="Logging streak"
        value={`${data.summary.currentStreakDays} ${
          data.summary.currentStreakDays === 1 ? "day" : "days"
        }`}
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
          className="min-h-[96px] flex-1 basis-[46%] justify-center gap-sm rounded-md bg-gray-100 p-md"
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
    <View className="h-[200px] justify-between py-sm">
      <SkeletonText size="caption" className="w-1/6" />
      <SkeletonBlock className="h-[110px] rounded-md" />
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
    <Card className="gap-md bg-light" style={{ borderWidth: 0 }}>
      <View className="flex-row justify-between">
        <SkeletonText size="heading" className="w-1/3" />
        <SkeletonText className="w-1/4" />
      </View>
      <View className="gap-xs">
        {Array.from({ length: 5 }).map((_, row) => (
          <View key={row} className="flex-row gap-xs">
            {Array.from({ length: 7 }).map((__, cell) => (
              <SkeletonBlock key={cell} className="h-[40px] flex-1 rounded-chip" />
            ))}
          </View>
        ))}
      </View>
    </Card>
  );
}

/**
 * Plot box inside the 340x200 viewBox. The left gutter holds the value ticks and
 * the band under `CHART_BOTTOM` holds the date labels + the axis caption, so the
 * chart carries its own axes rather than relying on a surrounding card.
 */
const CHART_LEFT = 46;
const CHART_RIGHT = 332;
const CHART_TOP = 30;
const CHART_BOTTOM = 150;

function MetricChart({
  points,
  metric,
  unitSystem,
  unitLabel,
  axisLabel,
}: {
  points: ChartPoint[];
  metric: ChartMetric;
  unitSystem: "metric" | "imperial";
  unitLabel: string;
  axisLabel: string;
}) {
  // The API answers in canonical units (kg, ml); the axis is labelled in the
  // user's, so convert before anything is measured or scaled.
  const series = useMemo(
    () =>
      points
        .filter((point): point is { date: string; value: number } => point.value !== null)
        .map((point) => ({
          date: point.date,
          value: displayValue(point.value, metric, unitSystem),
        })),
    [points, metric, unitSystem]
  );
  const geometry = useMemo(() => chartGeometry(series), [series]);
  // 0 -> 1 sweep that draws the trend line left to right. `strokeDasharray` is
  // set to the full polyline length and the offset walks it back to zero, so the
  // stroke appears to be drawn rather than faded in.
  const drawn = useCountUp(1, { decimals: 4 });
  if (series.length === 0) return <Text color="muted">No chart data yet.</Text>;

  const first = geometry.dots[0];
  const last = geometry.dots[geometry.dots.length - 1];
  const dateTickIndexes = axisTickIndexes(series.length);

  return (
    <Svg
      width="100%"
      height={200}
      viewBox="0 0 340 200"
      accessibilityLabel={`${labelForMetric(metric)} over time, in ${unitLabel}`}
    >
      <SvgText
        x={26}
        y={14}
        fill={colors.gray[500]}
        fontSize={11}
        fontFamily={fontFamilies.regular}
      >
        {unitLabel}
      </SvgText>
      {geometry.ticks.map((tick) => (
        <G key={tick.value}>
          <SvgText
            x={34}
            y={tick.y + 4}
            fill={colors.gray[500]}
            fontSize={11}
            fontFamily={fontFamilies.regular}
            textAnchor="end"
          >
            {formatAxisValue(tick.value, metric)}
          </SvgText>
          <Line
            x1={CHART_LEFT - 8}
            y1={tick.y}
            x2={CHART_LEFT - 3}
            y2={tick.y}
            stroke={colors.gray[400]}
            strokeWidth="1"
          />
        </G>
      ))}
      <Line
        x1={CHART_LEFT}
        y1={CHART_BOTTOM}
        x2={CHART_RIGHT}
        y2={CHART_BOTTOM}
        stroke={colors.gray[300]}
        strokeWidth="1"
      />
      {/* The fill trails the stroke slightly, so the line leads the shape. */}
      <Path d={`${geometry.area} Z`} fill={colors.primarySoft} opacity={drawn * drawn} />
      <Polyline
        points={geometry.line}
        fill="none"
        stroke={colors.primary}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={geometry.length}
        strokeDashoffset={geometry.length * (1 - drawn)}
      />
      {/* Only the endpoints are marked, the way the frame draws them. */}
      {first ? <Circle cx={first.x} cy={first.y} r="5" fill={colors.primary} /> : null}
      {last && geometry.dots.length > 1 ? (
        <Circle cx={last.x} cy={last.y} r="5" fill={colors.primary} opacity={drawn >= 1 ? 1 : 0} />
      ) : null}
      {dateTickIndexes.map((index) => (
        <SvgText
          key={series[index]?.date ?? index}
          x={geometry.dots[index]?.x ?? CHART_LEFT}
          y={CHART_BOTTOM + 18}
          fill={colors.gray[500]}
          fontSize={11}
          fontFamily={fontFamilies.regular}
          textAnchor="middle"
        >
          {formatAxisDate(series[index]?.date ?? "")}
        </SvgText>
      ))}
      <SvgText
        x={CHART_RIGHT}
        y={CHART_BOTTOM + 38}
        fill={colors.gray[500]}
        fontSize={11}
        fontFamily={fontFamilies.regular}
        textAnchor="end"
      >
        {axisLabel}
      </SvgText>
    </Svg>
  );
}

function chartGeometry(points: { value: number }[]) {
  const values = points.map((point) => point.value);
  const { lo, hi } = niceDomain(Math.min(...values), Math.max(...values));
  const spread = Math.max(hi - lo, 1);
  const yFor = (value: number) =>
    roundTo(CHART_BOTTOM - ((value - lo) / spread) * (CHART_BOTTOM - CHART_TOP), 1);
  const dots = points.map((point, index) => {
    const x =
      points.length === 1
        ? (CHART_LEFT + CHART_RIGHT) / 2
        : CHART_LEFT + (index / (points.length - 1)) * (CHART_RIGHT - CHART_LEFT);
    return { x: roundTo(x, 1), y: yFor(point.value) };
  });
  const line = dots.map((dot) => `${dot.x},${dot.y}`).join(" ");
  // Cumulative polyline length, used to drive the draw-on: `length` seeds the
  // dash pattern the offset walks back to zero.
  const length = dots
    .slice(1)
    .reduce(
      (total, dot, index) => total + Math.hypot(dot.x - dots[index].x, dot.y - dots[index].y),
      0
    );
  const area = `M ${dots[0]?.x ?? CHART_LEFT} ${CHART_BOTTOM} ${dots
    .map((dot) => `L ${dot.x} ${dot.y}`)
    .join(" ")} L ${dots[dots.length - 1]?.x ?? CHART_RIGHT} ${CHART_BOTTOM}`;
  const ticks = [hi, (hi + lo) / 2, lo].map((value) => ({ value, y: yFor(value) }));
  return { line, area, dots, length, ticks };
}

/**
 * Round the value axis out to a readable step so the three tick labels land on
 * whole numbers. Deliberately *not* zero-based: a weight series spanning 155-178
 * would be a flat line against a 0 baseline, which is the one thing this chart
 * exists to show.
 */
function niceDomain(min: number, max: number) {
  const rawSpread = Math.max(max - min, Math.abs(max) * 0.02, 0.5);
  const step = niceStep(rawSpread / 2);
  return {
    lo: Math.floor((min - rawSpread * 0.15) / step) * step,
    hi: Math.ceil((max + rawSpread * 0.15) / step) * step,
  };
}

function niceStep(rough: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, Number.EPSILON)));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Up to four evenly spaced points get a date label; more would collide. */
function axisTickIndexes(count: number) {
  if (count <= 1) return count === 1 ? [0] : [];
  const wanted = Math.min(4, count);
  const step = (count - 1) / (wanted - 1);
  return Array.from(new Set(Array.from({ length: wanted }, (_, i) => Math.round(i * step))));
}

type CalendarDay = {
  day: string;
  dayOfMonth: number;
  logged: boolean;
  today: boolean;
  inMonth: boolean;
};

function StreakCalendar({
  days,
  currentStreakDays,
  longestStreakDays,
  onSelectDay,
}: {
  days: CalendarDay[];
  currentStreakDays: number;
  longestStreakDays: number;
  onSelectDay: (day: string) => void;
}) {
  const rows = chunk(days, 7);
  // The frame separates a day that has already passed with nothing logged
  // (filled grey) from one still to come (white). The array is chronological, so
  // today's position splits the two.
  const todayIndex = days.findIndex((day) => day.today);

  return (
    <Card className="gap-md bg-light px-lg py-lg" style={{ borderWidth: 0 }}>
      <View className="flex-row items-center justify-between">
        <Text variant="body" color="dark" className="font-semibold">
          Current streak: {currentStreakDays}
        </Text>
        <Text variant="body-sm" color="muted">
          Personal best: {longestStreakDays}
        </Text>
      </View>
      <View className="flex-row gap-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text
            key={`${day}-${index}`}
            variant="body-sm"
            color="muted"
            className="flex-1 text-center"
          >
            {day}
          </Text>
        ))}
      </View>
      <View className="gap-xs">
        {rows.map((row, rowIndex) => (
          <View key={`week-${rowIndex}`} className="flex-row gap-xs">
            {row.map((day, cellIndex) => (
              <CalendarDayCell
                key={day.day}
                day={day}
                past={todayIndex >= 0 && rowIndex * 7 + cellIndex < todayIndex}
                onPress={() => onSelectDay(day.day)}
              />
            ))}
            {/* Keeps a short final week aligned to the same seven columns. */}
            {Array.from({ length: 7 - row.length }).map((_, index) => (
              <View key={`filler-${index}`} className="flex-1" />
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
  past,
  onPress,
}: {
  day: CalendarDay;
  past: boolean;
  onPress: () => void;
}) {
  const stateClass = day.today
    ? "border-primary bg-primary"
    : day.logged
      ? "border-loggedGreenBorder bg-loggedGreen"
      : past
        ? "border-gray-200 bg-gray-200"
        : "border-gray-200 bg-white";
  const textColor = day.today || day.logged ? "inverse" : "muted";
  // Nothing was logged on this day, so the sheet would open empty — keep the
  // cell inert instead of showing a dead-end bottom sheet.
  const disabled = !day.logged;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={disabled ? `No logs for ${day.day}` : `View logs for ${day.day}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      // The cell fills its column so the grid matches the frame; hitSlop lifts
      // the touch target to >=44pt (WCAG 2.2 AA), matching BackButton's approach.
      hitSlop={4}
      className={`h-[40px] flex-1 items-center justify-center rounded-chip border ${stateClass}`}
    >
      <Text variant="label" color={textColor} className={day.today ? "font-semibold" : undefined}>
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
      className={`min-h-[96px] flex-1 basis-[46%] justify-center rounded-md p-md ${
        tone ? "bg-primarySoft" : "bg-gray-100"
      }`}
    >
      <Text variant="label" color="dark">
        {label}
      </Text>
      <Text variant="metric" color="dark">
        {value}
      </Text>
      <Text variant="micro" color="muted">
        {detail}
      </Text>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <View className={`h-[16px] w-[16px] rounded-sm border border-gray-200 ${color}`} />
      <Text variant="body-sm" color="muted">
        {label}
      </Text>
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

/** Canonical API value (kg / ml) -> the unit the user reads the app in. */
function displayValue(value: number, metric: ChartMetric, unitSystem: "metric" | "imperial") {
  if (metric === "weight") return weightFromKg(value, unitSystem);
  if (metric === "water") return waterFromMl(value, unitSystem);
  return value;
}

function unitLabelFor(metric: ChartMetric, unitSystem: "metric" | "imperial") {
  if (metric === "weight") return weightUnitFor(unitSystem);
  if (metric === "water") return waterUnitFor(unitSystem);
  if (metric === "calories") return "kcal";
  return "g";
}

/** The time unit the x axis is read in, captioned bottom-right of the chart. */
function axisLabelFor(period: ChartPeriod) {
  if (period === "7d" || period === "14d") return "days";
  if (period === "1m" || period === "1q") return "weeks";
  return "months";
}

function formatAxisValue(value: number, metric: ChartMetric) {
  const decimals = metric === "weight" && Math.abs(value) < 100 ? 1 : 0;
  return roundTo(value, decimals).toLocaleString();
}

function formatAxisDate(day: string) {
  if (!day) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
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
