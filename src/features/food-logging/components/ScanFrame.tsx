import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";
import { Lightning } from "phosphor-react-native";
import { Text } from "@/components";
import { colors, sizing, spacing } from "@/theme";

/**
 * Geometry read from Figma `Log Food Scan Barcode` (46:1085) at the 390pt
 * frame width, where the box is 350 wide. Everything horizontal is expressed
 * as a fraction of the box so the frame still matches on a wider phone; only
 * the vertical numbers are absolute, because the box height is.
 */
/** 46:1086 — the dark box. */
const FRAME_HEIGHT = 200;
/** 46:1088-91 — the corner brackets sit 20 in from each edge. */
const BRACKET_INSET = 20;
/** 46:1087 — the line spans 294 of the box's 350. */
const LINE_WIDTH = "84%";
/**
 * The line travels between the brackets rather than edge to edge, so the sweep
 * reads as "this is the area the camera is reading", which is the whole point
 * of drawing the brackets. Figma parks it at the midpoint; that midpoint is the
 * centre of this travel.
 */
const SWEEP = FRAME_HEIGHT / 2 - BRACKET_INSET;
/** One direction of the sweep. Slow enough to scan by, not a strobe. */
const SWEEP_DURATION = 1600;

type CornerName = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

const BRACKET_EDGES: Record<CornerName, string> = {
  topLeft: "border-l border-t",
  topRight: "border-r border-t",
  bottomLeft: "border-l border-b",
  bottomRight: "border-r border-b",
};

function Bracket({ corner }: { corner: CornerName }) {
  return (
    <View
      className={`absolute border-scanFrame ${BRACKET_EDGES[corner]}`}
      style={{
        width: sizing.icon,
        height: sizing.icon,
        ...(corner.startsWith("top") ? { top: BRACKET_INSET } : { bottom: BRACKET_INSET }),
        ...(corner.endsWith("Left") ? { left: BRACKET_INSET } : { right: BRACKET_INSET }),
      }}
    />
  );
}

/**
 * The sweeping line, deliberately its own memoised component taking a single
 * boolean.
 *
 * The animation is driven natively, but the node that carries it is built in
 * JS: `interpolate()` mints a new animated node and the style object holding it
 * is a new reference. Rebuild either on a render and React Native tears the
 * native node off the view and attaches a fresh one — which stutters, and drops
 * the line back to wherever the JS value last was. `ScanBarcodeScreen` renders
 * on every lookup state change, every status message and every keystroke in the
 * dev barcode field, so that was happening constantly. Memoising the style is
 * only half the fix; taking a `boolean` prop is the other half, because it
 * means the parent's renders stop here instead of reaching the animated view.
 */
const ScanLine = memo(function ScanLine({ active }: { active: boolean }) {
  // 0 = top of the sweep, 1 = bottom. Parked at 0.5 — where Figma draws it.
  const sweep = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!active) {
      sweep.setValue(0.5);
      return;
    }
    sweep.setValue(0);
    const timing = (toValue: number) =>
      Animated.timing(sweep, {
        toValue,
        duration: SWEEP_DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        // A permanent ambient loop is not an interaction; left on, it pins an
        // InteractionManager handle open for as long as the screen is mounted.
        isInteraction: false,
      });
    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]), {
      // The default (`true`) restores the value from JS between laps, which is
      // the visible snap at the top of every sweep. The sequence already ends
      // where it starts, so there is nothing to reset.
      resetBeforeIteration: false,
    });
    loop.start();
    return () => loop.stop();
  }, [active, sweep]);

  const style = useMemo(
    () => ({
      top: FRAME_HEIGHT / 2,
      transform: [
        {
          translateY: sweep.interpolate({
            inputRange: [0, 1],
            outputRange: [-SWEEP, SWEEP],
          }),
        },
      ],
    }),
    [sweep]
  );

  return (
    <Animated.View
      testID="scan-line"
      className="absolute left-0 right-0 items-center"
      style={style}
    >
      <View className="h-[1px] bg-scanFrame" style={{ width: LINE_WIDTH }} />
    </Animated.View>
  );
});

export interface ScanFrameProps {
  /** The camera preview, or the permission prompt standing in for it. */
  children: ReactNode;
  /**
   * Sweep the line only while a scan can actually land. A line still moving
   * after a capture, or with the camera permission withheld, claims the app is
   * looking when it is not.
   */
  scanning: boolean;
}

/**
 * The dark reticle box on Scan Barcode: corner brackets, flash glyph, caption,
 * and a scan line that sweeps between the brackets while the camera is live.
 */
export function ScanFrame({ children, scanning }: ScanFrameProps) {
  return (
    <View className="overflow-hidden rounded-lg bg-dark" style={{ height: FRAME_HEIGHT }}>
      {children}
      <View className="absolute inset-0" pointerEvents="none">
        <Bracket corner="topLeft" />
        <Bracket corner="topRight" />
        <Bracket corner="bottomLeft" />
        <Bracket corner="bottomRight" />
        <View className="absolute left-0 right-0 items-center" style={{ top: BRACKET_INSET }}>
          <Lightning size={sizing.icon} color={colors.scanFrame} />
        </View>
        <ScanLine active={scanning} />
        <View className="absolute left-0 right-0" style={{ bottom: spacing.lg }}>
          <Text variant="caption" color="inverse" className="text-center">
            Align barcode with frame
          </Text>
        </View>
      </View>
    </View>
  );
}
