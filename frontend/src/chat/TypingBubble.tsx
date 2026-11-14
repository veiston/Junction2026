import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { coachColors, colors, fonts, spacing } from "@/theme";

import { CoachAvatar } from "./CoachAvatar";

export const STEP_MS = 1600;

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return <Animated.View style={[styles.dot, { opacity: v }]} />;
}

/** "The coach is typing": animated dots plus what it is doing right now, one step at a time. */
export function TypingBubble({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (steps.length < 2) return;
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(t);
  }, [steps]);

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={steps[i] ?? "The coach is typing"}>
      <CoachAvatar />
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
        {steps[i] ? (
          <Text style={styles.step} testID="typing-step">
            {steps[i]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  bubble: {
    backgroundColor: coachColors.surfaceMuted,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    maxWidth: "80%",
  },
  dots: { flexDirection: "row", gap: 5, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  step: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
});
