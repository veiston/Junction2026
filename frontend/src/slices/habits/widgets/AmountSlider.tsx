import { Pressable, StyleSheet, Text, View } from "react-native";

import { coachColors, colors, fonts, spacing } from "@/theme";

import { MIN_TOUCH, ProgressBar } from "./ui";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  format: (cents: number) => string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Slider with minus / plus steppers; also adjustable by assistive technology. */
export function AmountSlider({ value, min, max, step, onChange, label, format }: Props) {
  const safeStep = step > 0 ? step : 1;
  const set = (v: number) => onChange(clamp(v, min, max));
  const fraction = max > min ? (value - min) / (max - min) : 0;
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment") set(value + safeStep);
        if (e.nativeEvent.actionName === "decrement") set(value - safeStep);
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease limit"
        disabled={value <= min}
        onPress={() => set(value - safeStep)}
        style={[styles.step, value <= min && styles.disabled]}
      >
        <Text style={styles.stepText}>-</Text>
      </Pressable>
      <View style={styles.middle}>
        <ProgressBar fraction={fraction} color={colors.primary} label={`${label} position`} />
        <View style={styles.bounds}>
          <Text style={styles.bound}>{format(min)}</Text>
          <Text style={styles.bound}>{format(max)}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase limit"
        disabled={value >= max}
        onPress={() => set(value + safeStep)}
        style={[styles.step, value >= max && styles.disabled]}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  middle: { flex: 1, gap: spacing.xs },
  bounds: { flexDirection: "row", justifyContent: "space-between" },
  bound: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  step: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: coachColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  disabled: { opacity: 0.4 },
});
