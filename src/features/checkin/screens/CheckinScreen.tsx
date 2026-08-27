import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Flame } from "phosphor-react-native";
import { queryClient, queryKeys } from "@/api";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Screen,
  SectionError,
  SkeletonText,
  Text,
} from "@/components";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { useDashboardStreak } from "@/features/dashboard";
import { colors } from "@/theme";
import type { Mood } from "@/contracts";
import { useCheckins, useCreateCheckin } from "../hooks/useCheckin";
import { milestoneFor } from "../utils/milestones";
import { moodResponse, type MoodTone } from "../utils/mood-response";
import { MOOD_SCALE, moodOption } from "../utils/mood-scale";

// The shared scale runs low → high; this screen reads high → low.
const moods = [...MOOD_SCALE].reverse();

const moodLabel = (mood: Mood): string => moodOption(mood).label;

/**
 * Surface for the response card, by tone.
 *
 * A positive mood gets the green lift; "okay" and "low" share a neutral surface
 * on purpose. Colouring a low mood as a warning would frame how someone feels as
 * an error state — the copy carries the difference instead.
 */
const toneSurface: Record<MoodTone, string> = {
  positive: "bg-primarySoft",
  steady: "bg-gray-100",
  low: "bg-gray-100",
};

const toneAccent: Record<MoodTone, "primary" | "muted"> = {
  positive: "primary",
  steady: "muted",
  low: "muted",
};

export function CheckinScreen() {
  const router = useRouter();
  const day = useCurrentDay();
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const create = useCreateCheckin();
  const history = useCheckins();

  const streak = useDashboardStreak();
  const [editing, setEditing] = useState(false);

  // The response used to render only from `create.data`, so it survived exactly
  // as long as the mutation result did. Anyone who checked in, went to the
  // dashboard and came back was shown the empty form again — and the tip the
  // backend had already selected for them was gone for good. Today's check-in
  // comes from history too, so it is the same view either way.
  // Both sources are filtered by `day`. `useCurrentDay` deliberately rolls over
  // at midnight and on foreground, so a screen left mounted across midnight
  // would otherwise keep showing yesterday's response — and never offer today's
  // form — because `create.data` still holds yesterday's mutation result.
  const submitted = create.data?.checkin;
  const todaysCheckin =
    (submitted?.day === day ? submitted : null) ??
    (history.data ?? []).find((c) => c.day === day) ??
    null;
  const showForm = !todaysCheckin || editing;

  const response = todaysCheckin ? moodResponse(todaysCheckin.mood) : null;
  // Celebrated only on an exact hit, and only once the day is checked in.
  const milestone = todaysCheckin ? milestoneFor(streak.data?.currentStreakDays ?? 0) : null;

  const submit = () => {
    if (!mood) return;
    const trimmed = note.trim();
    create.mutate(
      { mood, day, note: trimmed.length > 0 ? trimmed : undefined },
      { onSuccess: () => setEditing(false) }
    );
  };

  // Re-opening the form seeds it with what was already saved, so "update" reads
  // as an edit rather than starting from nothing.
  const startEditing = () => {
    if (!todaysCheckin) return;
    setMood(todaysCheckin.mood);
    setNote(todaysCheckin.note ?? "");
    setEditing(true);
  };

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.list() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.streak() }),
    ]).finally(() => setRefreshing(false));
  };

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      rhythm="default"
      header={
        <PageHeader
          title="Daily check-in"
          subtitle="How are you feeling today? A quick check-in keeps your streak alive."
        />
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {!showForm && todaysCheckin && response ? (
        <View className="gap-md">
          <Card className={`gap-md ${toneSurface[response.tone]}`}>
            <Text variant="heading3" color="dark">
              {response.heading}
            </Text>
            <Text variant="body" color="dark">
              {response.body}
            </Text>
            {/* The tip is server-selected and nullable. When it is absent the
                response above stands on its own rather than leaving a gap. */}
            {todaysCheckin.tip ? (
              <View className="gap-xs">
                <Text variant="caption" color={toneAccent[response.tone]} className="font-semibold">
                  Thrivo Tip
                </Text>
                <Text variant="body" color="dark">
                  {todaysCheckin.tip}
                </Text>
              </View>
            ) : null}
            <Button
              label="Back to dashboard"
              onPress={() => router.replace("/(app)/(tabs)/dashboard")}
            />
            <Pressable
              accessibilityRole="button"
              onPress={startEditing}
              className="min-h-touchTarget items-center justify-center"
            >
              <Text variant="caption" color="muted">
                Change how you’re feeling
              </Text>
            </Pressable>
          </Card>

          {milestone ? (
            <Card className="flex-row items-center gap-md bg-accentSoft">
              <Flame size={24} color={colors.accent} weight="fill" />
              <View className="flex-1 gap-xs">
                <Text variant="body" color="accent" className="font-semibold">
                  {milestone.title}
                </Text>
                <Text variant="body-sm" color="accentText">
                  {milestone.body}
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      ) : (
        <View className="gap-xl">
          <View className="gap-md">
            <Text variant="heading3" color="dark">
              Your mood
            </Text>
            <View className="flex-row justify-between">
              {moods.map((option) => {
                const selected = option.value === mood;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                    onPress={() => setMood(option.value)}
                    className={`min-h-[72px] flex-1 items-center justify-center gap-xs rounded-md py-sm ${
                      selected ? "bg-primarySoft" : "bg-gray-100"
                    }`}
                  >
                    <Text variant="heading2">{option.emoji}</Text>
                    <Text variant="caption" color={selected ? "primary" : "muted"}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label="Anything on your mind? (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="A note to your future self…"
            multiline
            maxLength={500}
          />

          {todaysCheckin ? (
            <Text variant="caption" color="muted">
              You already checked in today — saving again updates it.
            </Text>
          ) : null}

          {create.isError ? (
            <SectionError
              title="Could not save your check-in"
              message="Check your connection and try again."
              onRetry={submit}
              className="border-0 p-0"
            />
          ) : null}

          <Button
            label={todaysCheckin ? "Update check-in" : "Save check-in"}
            loading={create.isPending}
            disabled={!mood}
            onPress={submit}
          />

          {/* Without this, re-opening the form is a one-way door — there is no
              way back to today's response short of leaving the screen. */}
          {editing ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditing(false)}
              className="min-h-touchTarget items-center justify-center"
            >
              <Text variant="caption" color="muted">
                Cancel
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View className="gap-md">
        <Text variant="heading3" color="muted">
          Recent check-ins
        </Text>
        {history.isLoading ? (
          <View className="gap-sm">
            <SkeletonText className="w-2/3" />
            <SkeletonText className="w-1/2" />
          </View>
        ) : history.isError ? (
          <SectionError
            title="Could not load history"
            message="Your past check-ins are unavailable right now."
            onRetry={() => void history.refetch()}
          />
        ) : (history.data ?? []).length === 0 ? (
          <Text variant="body" color="muted">
            No check-ins yet. Today is a great day to start.
          </Text>
        ) : (
          (history.data ?? []).map((checkin) => (
            <View
              key={checkin.id}
              className="flex-row items-center justify-between border-b border-gray-200 py-sm"
            >
              <View className="flex-1 pr-md">
                <Text variant="body" color="dark">
                  {moods.find((m) => m.value === checkin.mood)?.emoji ?? "•"}{" "}
                  {moodLabel(checkin.mood)}
                </Text>
                {checkin.note ? (
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {checkin.note}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" color="muted">
                {checkin.day}
              </Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
