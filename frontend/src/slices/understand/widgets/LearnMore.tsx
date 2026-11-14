import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors, fonts, radius, spacing } from "@/theme";

import type { Learn, NextStep } from "../learn";

/** "Did you know?" line plus next-step chips, shown right under a card like a coach's follow-up. */
export function LearnMore({ learn, onNext }: { learn: Learn; onNext: (step: NextStep) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tip} accessibilityLabel={`Did you know? ${learn.tip}`}>
        <Icon name="lightbulb-on-outline" size={18} color={colors.primary} />
        <View style={styles.tipBody}>
          <Text style={styles.tipTitle}>Did you know?</Text>
          <Text style={styles.tipText} testID="did-you-know">
            {learn.tip}
          </Text>
        </View>
      </View>
      <View style={styles.chips} accessibilityLabel="Next steps">
        {learn.next.map((s) => (
          <Pressable key={s.label} accessibilityRole="button" onPress={() => onNext(s)} style={styles.chip}>
            <Text style={styles.chipText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tip: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  tipBody: { flex: 1, gap: 2 },
  tipTitle: { fontSize: 13, fontFamily: fonts.semibold, color: colors.primary },
  tipText: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, color: colors.primary },
});
