import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import type { QuickAction } from "@/contracts";
import { coachColors, colors, fonts, spacing } from "@/theme";

/** `prompt` is what the customer "says" in the chat when the card is tapped. */
export const FUNCTIONS: { action: QuickAction; title: string; description: string; prompt: string; icon: IconName }[] = [
  {
    action: "understand_my_money",
    title: "Understand My Money",
    prompt: "Show me my spending analysis and monthly trends",
    description: "Spending analysis · Subscriptions · Monthly trends · Finnish household comparisons",
    icon: "chart-donut",
  },
  {
    action: "plan_my_finances",
    title: "Plan My Finances",
    prompt: "Help me plan my finances",
    description: "Balance forecasts · Upcoming bills · Spending alerts · Purchase simulator",
    icon: "calendar-month-outline",
  },
  {
    action: "improve_my_habits",
    title: "Improve My Habits",
    prompt: "Help me improve my habits",
    description: "Personalized challenges · Savings simulations · Progress tracking · Learning feedback",
    icon: "school-outline",
  },
];

/** The three function cards of the first view. */
export function FunctionCards({ onPick, disabled }: { onPick: (a: QuickAction) => void; disabled?: boolean }) {
  return (
    <View style={styles.list} accessibilityRole="toolbar" accessibilityLabel="Functions">
      {FUNCTIONS.map((f) => (
        <Pressable
          key={f.action}
          accessibilityRole="button"
          accessibilityLabel={f.title}
          disabled={disabled}
          onPress={() => onPick(f.action)}
          style={[styles.card, disabled && styles.disabled]}
        >
          <View style={styles.head}>
            <View style={styles.iconCircle}>
              <Icon name={f.icon} size={18} color={colors.text} />
            </View>
            <Text style={styles.title}>{f.title}</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </View>
          <Text style={styles.description}>{f.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: coachColors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  disabled: { opacity: 0.5 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: coachColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  description: { fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: colors.textMuted, paddingLeft: 42 },
});
