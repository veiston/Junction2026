import { StyleSheet, Text, View } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { ExpenseAlerts as ExpenseAlertsData } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";
import { Money } from "@/widgets/common/Money";
import { WidgetCard } from "@/widgets/common/WidgetCard";

const SEVERITY_LABEL = { info: "Heads-up", warning: "Unusually high" };

export function ExpenseAlerts({ widget }: WidgetProps<ExpenseAlertsData>) {
  const { alerts } = widget.data;

  if (alerts.length === 0) {
    return (
      <WidgetCard title="Expense alerts">
        <Text style={styles.empty}>No unusually big expenses lately. Everything looks normal.</Text>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Expense alerts">
      {alerts.map((alert) => (
        <View key={alert.transaction.id} style={styles.row}>
          <View style={styles.top}>
            <View style={styles.left}>
              <Text style={styles.label}>{alert.transaction.label}</Text>
              <Text style={styles.detail}>{alert.transaction.date}</Text>
            </View>
            <Money cents={alert.transaction.amount_cents} />
          </View>
          <Text style={styles.reason}>{alert.reason}</Text>
          <Text style={[styles.severity, alert.severity === "warning" && styles.warning]}>
            {SEVERITY_LABEL[alert.severity]}
          </Text>
        </View>
      ))}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: fontSize.small, color: colors.textMuted },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.xs,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  left: { flex: 1 },
  label: { fontSize: fontSize.small, color: colors.text },
  detail: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  reason: { fontSize: fontSize.small - 1, color: colors.textMuted },
  severity: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  warning: { color: colors.warning, fontWeight: "600" },
});
