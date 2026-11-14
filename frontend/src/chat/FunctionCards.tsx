import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import type { QuickAction } from "@/contracts";
import { colors, fonts } from "@/theme";

/** `prompt` (optional) is what the customer "says" when the card is tapped; default QUICK_ACTION_TEXT. */
export const FUNCTIONS: { action: QuickAction; title: string; description: string; prompt?: string; icon: IconName }[] = [
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
    description: "Balance forecasts · Upcoming bills · Spending alerts · Purchase simulator",
    icon: "calendar-month-outline",
  },
  {
    action: "improve_my_habits",
    title: "Improve My Habits",
    description: "A 7-day test on your spending · Savings estimate · Progress tracking · Plain-language tips",
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
              <Icon name={f.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.title}>{f.title}</Text>
            <Icon name="chevron-right" size={20} color={colors.primary} />
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
    borderColor: "#D2E5D6",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  disabled: { opacity: 0.5 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DDF0E2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 16, fontFamily: fonts.semibold, color: "#14331E" },
  description: { fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: colors.textMuted, paddingLeft: 48 },
});
