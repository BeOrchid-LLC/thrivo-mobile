import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, ThrivoMark } from "@/components";
import { colors } from "@/theme";

/**
 * Figma-exact metrics for the two auth entry screens, measured off the "Sign In"
 * and "Sign Up" frames (393pt wide). They are literals rather than scale tokens
 * because the scale has no 20 or 33 — same reason `FigmaAuthRow` carries its own
 * dimensions.
 */
const PAGE_PADDING_X = 20;
/** Sits the mark just under the status bar, on top of the safe-area inset. */
const PAGE_PADDING_TOP = 3;
const PAGE_PADDING_BOTTOM = 40;
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: PAGE_PADDING_X,
              paddingTop: PAGE_PADDING_TOP,
              paddingBottom: PAGE_PADDING_BOTTOM,
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
