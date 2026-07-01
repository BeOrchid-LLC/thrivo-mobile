import { useEffect, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme";
import { ThrivoMark } from "./ThrivoMark";

// Rest size of the animated mark. Must stay equal to the expo-splash-screen
// `imageWidth` in app.json so the native mark and this one are the same on-screen
// size — the static logo "comes alive" in place with no size jump at handoff.
const MARK_SIZE = 96;

/**
 * Branded loading screen shown while fonts and auth status resolve — covers the
 * window between the native splash hiding and the first real screen so there is
 * never a blank flash.
 *
 * The native mark hands off to a short entrance: the logo springs + fades in,
 * then the wordmark and spinner cascade in below. Entrance-only (the spinner
 * self-animates), light-mode only. Honours reduce-motion by settling straight to
 * the final frame. LinearGradient is a third-party wrapper, so its colors stay
 * token-sourced props rather than className.
 */
export function BrandSplash() {
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        logoScale.setValue(1);
        logoOpacity.setValue(1);
        contentOpacity.setValue(1);
        return;
      }
      // Logo: gentle overshoot/settle while fading in, both in parallel.
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      // Wordmark + spinner cascade in after the logo has begun to settle.
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [logoScale, logoOpacity, contentOpacity]);

  return (
    <LinearGradient
      // First stop is the page background token (matches the native splash bg);
      // second is the soft green tint.
      colors={[colors.light, colors.primarySoft]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <ThrivoMark size={MARK_SIZE} />
      </Animated.View>
      <Animated.View style={{ opacity: contentOpacity, alignItems: "center" }}>
        <Text className="mt-lg font-bold text-[20px] leading-[24px] tracking-[0.44px] text-dark">
          THRIVO
        </Text>
        <ActivityIndicator color={colors.primary} className="mt-[28px]" />
      </Animated.View>
    </LinearGradient>
  );
}
