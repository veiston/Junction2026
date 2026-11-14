import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { coachColors, colors, fonts, radius, spacing } from "@/theme";

export const MIN_TOUCH = 44;

export function Card({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <View style={styles.card} accessibilityLabel={label}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: string }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: colors.textMuted }]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

/** Purple on purpose: it must be obvious this is a developer tool, not part of the product. */
export const devPurple = "#7B3FE4";

export function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={styles.dev}>
      <Text style={styles.devText}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({
  fraction,
  color,
  label,
}: {
  fraction: number;
  color: string;
  label: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ErrorText({ children }: { children: string }) {
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  );
}

export const danger = "#C0392B";

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: coachColors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  button: {
    minHeight: 36,
    alignSelf: "flex-start",
    borderRadius: radius.round,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondary: {
    minHeight: 36,
    alignSelf: "flex-start",
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  dev: {
    minHeight: 36,
    alignSelf: "flex-start",
    borderRadius: radius.round,
    backgroundColor: devPurple,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  devText: { fontFamily: fonts.semibold, fontSize: 14, color: "#FFFFFF" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onPrimary },
  track: { height: 10, borderRadius: 5, backgroundColor: coachColors.surfaceMuted, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: danger },
});
