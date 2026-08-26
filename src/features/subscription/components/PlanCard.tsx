import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PremiumSurface, Text } from "@/components";
import { colors, spacing } from "@/theme";

/**
 * The frame sets more air inside the card than the spacing scale's `xl`, and
 * puts the ledger further from the headline than any two rows sit apart.
 */
const CARD_PADDING_X = spacing.xl;
const CARD_PADDING_Y = 22;
const HEADLINE_TO_LEDGER = 26;
/** The decorative disc the frame tucks under the card's top-right corner. */
const DISC_SIZE = 116;
const DISC_OFFSET = -22;

export interface PlanCardRow {
  label: string;
  value: string;
  /** Draw the value in the amber accent — the frame's "Pay nothing". */
  accent?: boolean;
}

export interface PlanCardProps {
  priceLabel: string;
  periodLabel: string;
  /** The line under the price: the trial length, or what the plan saves. */
  headline: string;
  /** Pill in the top-right corner — the frame's "Best value" on annual. */
  badge?: string;
  rows: readonly PlanCardRow[];
  /**
   * `dark` is the app's premium surface, `light` the soft green twin. The frame
   * gives the annual plan the dark one, so the better-value plan is also the
   * one that looks like the paid tier.
   */
  tone: "light" | "dark";
}

function Row({ label, value, accent, tone }: PlanCardRow & { tone: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <View
      className={`flex-row items-center justify-between gap-md border-b pb-sm ${
        dark ? "border-white/[0.14]" : "border-black/[0.08]"
      }`}
    >
      <Text variant="body-sm" color={dark ? "light70" : "dark"}>
        {label}
      </Text>
      <Text
        variant="body-sm"
        color={accent ? "accent" : dark ? "inverse" : "dark"}
        className="shrink font-semibold"
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * The paywall's plan summary: price, what it costs today, and the three dates
 * that decide whether a trial ever turns into a charge.
 *
 * Both tones draw the same content in the same places — the plan picker swaps
 * the surface under it, not the shape of the card, so switching plans does not
 * move a single number on the screen.
 */
export function PlanCard({ priceLabel, periodLabel, headline, badge, rows, tone }: PlanCardProps) {
  const dark = tone === "dark";

  const content = (
    <>
      <View className="flex-row items-end justify-between gap-md">
        <View className="flex-row items-end">
          <Text variant="hero" color={dark ? "inverse" : "dark"} className="font-bold">
            {priceLabel}
          </Text>
          <Text variant="body" color={dark ? "light70" : "muted"} className="mb-xs ml-sm">
            / {periodLabel}
          </Text>
        </View>
        {badge ? (
          <View className="mb-sm rounded-pill bg-accent px-md py-xs">
            <Text variant="caption" color="dark" className="font-semibold">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="body-sm" color="accent" className="mt-xs font-bold">
        {headline}
      </Text>

      <View style={{ marginTop: HEADLINE_TO_LEDGER }} className="gap-md">
        {rows.map((row) => (
          <Row key={row.label} {...row} tone={tone} />
        ))}
      </View>
    </>
  );

  if (dark) {
    return (
      <PremiumSurface
        raised
        contentStyle={{ paddingHorizontal: CARD_PADDING_X, paddingVertical: CARD_PADDING_Y }}
      >
        {content}
      </PremiumSurface>
    );
  }

  return (
    <View className="overflow-hidden rounded-panel border-[1.5px] border-primary">
      {/* Straight down, white to the brand tint — the frame's card is lighter at
          the price than it is at the last row. */}
      <LinearGradient
        colors={[colors.white, colors.primarySoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: CARD_PADDING_X, paddingVertical: CARD_PADDING_Y }}
      >
        {/* The frame's warm disc, clipped by the card's top-right corner. */}
        <View
          pointerEvents="none"
          className="absolute rounded-pill bg-accent/25"
          style={{ height: DISC_SIZE, width: DISC_SIZE, top: DISC_OFFSET, right: DISC_OFFSET }}
        />
        {content}
      </LinearGradient>
    </View>
  );
}
