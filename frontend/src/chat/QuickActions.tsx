import { Pressable, StyleSheet, Text, View } from "react-native";

import type { QuickAction } from "@/contracts";
import { colors, fontSize, radius, spacing } from "@/theme";

export const CHIPS: { action: QuickAction; label: string }[] = [
  { action: "understand_my_money", label: "Understand my money" },
  { action: "plan_my_finances", label: "Plan my finances" },
  { action: "improve_my_habits", label: "Improve my habits" },
];

export function QuickActions({ onChip, disabled }: { onChip: (a: QuickAction) => void; disabled?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="toolbar" accessibilityLabel="Suggested actions">
      {CHIPS.map((c) => (
        <Pressable
          key={c.action}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onChip(c.action)}
          style={[styles.chip, disabled && styles.disabled]}
        >
          <Text style={styles.text}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: fontSize.small, color: colors.primary },
});
