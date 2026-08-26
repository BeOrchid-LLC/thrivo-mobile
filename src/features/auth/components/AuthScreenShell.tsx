import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoider, Text, ThrivoMark } from "@/components";
import { colors } from "@/theme";

/**
 * Figma-exact metrics for the two auth entry screens, measured off the "Sign In"
 * and "Sign Up" frames (393pt wide). They are literals rather than scale tokens
 * because the scale has no 20 or 33 — same reason `FigmaAuthRow` carries its own
 * dimensions.
 */
const PAGE_PADDING_X = 20;
/**
 * The block is centred in the page, so the vertical padding is only the
 * breathing room it keeps once it grows tall enough to scroll (small screens,
 * keyboard open) — symmetric top and bottom so the centring survives.
 */
const PAGE_PADDING_Y = 40;
const MARK_SIZE = 33;
const MARK_TO_TITLE = 38;
const TITLE_TO_SUBTITLE = 17;
/** Gap under the subtitle, and between every row of the form below it. */
const FORM_GAP = 31;
/** Holds the subtitle to the two-line wrap the frames show. */
const SUBTITLE_MAX_WIDTH = 306;

export interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  /** Override when the frame's subtitle breaks at a narrower width. */
  subtitleWidth?: number;
  children: ReactNode;
}

/**
 * Shared chrome for the two auth entry screens: the light → soft-green page
 * gradient, the centred Thrivo mark, and the centred title/subtitle block. The
 * screens differ only in their form, so the chrome lives here instead of being
 * laid out twice and drifting.
 */
export function AuthScreenShell({
  title,
  subtitle,
  subtitleWidth = SUBTITLE_MAX_WIDTH,
  children,
}: AuthScreenShellProps) {
  return (
    // First stop is the page background token, second the soft green tint —
    // same pairing as the welcome screen, so the auth surfaces read as one set.
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoider>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: PAGE_PADDING_X,
              paddingVertical: PAGE_PADDING_Y,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center">
              <ThrivoMark size={MARK_SIZE} />
              <Text
                variant="heading2"
                color="dark"
                accessibilityRole="header"
                style={{ marginTop: MARK_TO_TITLE }}
                className="text-center"
              >
                {title}
              </Text>
              <Text
                variant="body"
                color="subtle"
                style={{ marginTop: TITLE_TO_SUBTITLE, maxWidth: subtitleWidth }}
                className="text-center"
              >
                {subtitle}
              </Text>
            </View>

            <View style={{ marginTop: FORM_GAP, gap: FORM_GAP }}>{children}</View>
          </ScrollView>
        </KeyboardAvoider>
      </SafeAreaView>
    </LinearGradient>
  );
}
