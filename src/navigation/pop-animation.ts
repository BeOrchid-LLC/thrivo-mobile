import type { ParamListBase } from "@react-navigation/native";
import type {
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

/**
 * Asymmetric stack transition: silent on push, slide-out-right on pop.
 *
 * react-native-screens has no "different animation each way" option — a screen
 * has one `stackAnimation`. But the iOS animator resolves it *per transition*,
 * reading the **departing** screen's current value when popping
 * (`RNSScreenStackAnimator.mm`, `animateTransition:`). So mounting a screen with
 * `none` and flipping it to `slide_from_right` once it has appeared gives a push
 * with no animation and a pop that slides the current screen off to the right,
 * revealing the previous one underneath.
 *
 * The flip is deferred to `transitionEnd` rather than `focus` on purpose: focus
 * fires while the push is still resolving, which would let the new value leak
 * into the push we are trying to suppress.
 */
export const POP_ONLY_ANIMATION = "slide_from_right" as const;

/**
 * A stable module constant, not an inline literal at each call site. Expo
 * Router's `Stack` re-wraps `screenOptions` in a `useMemo` keyed on its
 * identity, so a fresh object every render rebuilds the options function and
 * every screen descriptor along with it.
 */
export const popOnlyScreenOptions = {
  headerShown: false,
  // Every screen mounts silent. The listener below upgrades it afterwards.
  animation: "none",
  // Keep the edge-swipe back gesture, which picks up the upgraded animation.
  gestureEnabled: true,
} satisfies NativeStackNavigationOptions;

/**
 * Function form on purpose: the `transitionEnd` event payload carries only
 * `{ closing }`, so the per-screen `navigation` we need to call `setOptions` on
 * has to come from the enclosing `screenListeners` argument.
 */
export const popOnlyScreenListeners = ({
  route,
  navigation,
}: {
  route: { name: string };
  navigation: NativeStackNavigationProp<ParamListBase>;
}) => ({
  transitionEnd: (event: { data: { closing: boolean } }) => {
    if (__DEV__) {
      console.info(`[pop-anim] transitionEnd ${route.name} closing=${event.data.closing}`);
    }
    // `closing: true` is the pop itself — re-arming there would re-render a
    // screen that is already on its way out.
    if (event.data.closing) return;
    navigation.setOptions({ animation: POP_ONLY_ANIMATION });
    if (__DEV__) console.info(`[pop-anim] armed ${route.name} -> ${POP_ONLY_ANIMATION}`);
  },
});
