import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

/** Example questions under the cards. Tapping one sends its `message` to the chat. */
export const SUGGESTIONS: { label: string; message: string; icon: IconName }[] = [
  { label: "Coffee spend", message: "How much do I spend on coffee?", icon: "coffee-outline" },
  { label: "Trip check", message: "Check my spending on my latest trip.", icon: "airplane" },
  { label: "National benchmark", message: "How do I compare to the national average?", icon: "chart-line" },
];

export function SuggestionChips({ onPick, disabled }: { onPick: (message: string) => void; disabled?: boolean }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Example questions"
    >
      {SUGGESTIONS.map((s) => (
        <Pressable
          key={s.label}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onPick(s.message)}
          style={[styles.chip, disabled && styles.disabled]}
        >
          <Icon name={s.icon} size={14} color={colors.primary} />
          <Text style={styles.text}>{s.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radius.round,
    backgroundColor: coachColors.surfaceMuted,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 12, fontFamily: fonts.medium, color: colors.text },
});
