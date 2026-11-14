import { StyleSheet, Text, View } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { UpcomingBills as UpcomingBillsData } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";
import { Money } from "@/widgets/common/Money";
import { WidgetCard } from "@/widgets/common/WidgetCard";

export function UpcomingBills({ widget }: WidgetProps<UpcomingBillsData>) {
  const { bills, horizon_days, total_cents } = widget.data;

  if (bills.length === 0) {
    return (
      <WidgetCard title="Upcoming bills">
        <Text style={styles.empty}>No bills expected in the next {horizon_days} days. Nothing to plan for.</Text>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Upcoming bills">
      {bills.map((bill) => (
        <View key={`${bill.label}-${bill.due_date}`} style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.label}>{bill.label}</Text>
            <Text style={styles.detail}>
              {bill.due_date} · {bill.confidence} confidence
            </Text>
          </View>
          <Money cents={bill.amount_cents} />
        </View>
      ))}
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Total, next {horizon_days} days</Text>
        <Money cents={total_cents} />
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: fontSize.small, color: colors.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  left: { flex: 1 },
  label: { fontSize: fontSize.small, color: colors.text },
  detail: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  totalLabel: { fontSize: fontSize.small, fontWeight: "600", color: colors.text },
});
