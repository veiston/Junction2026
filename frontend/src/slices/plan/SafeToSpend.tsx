import { StyleSheet, Text, View } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { SafeToSpend as SafeToSpendData } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";
import { Money } from "@/widgets/common/Money";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { SAFE_TO_SPEND_LESSON } from "./lessons";
import { QuickLesson } from "./QuickLesson";

const OVER_COLOR = "#C0392B";

const STATUS_LABEL = { comfortable: "Comfortable", tight: "Tight", over: "Over budget" };
const STATUS_COLOR = { comfortable: colors.primary, tight: colors.warning, over: OVER_COLOR };

export function SafeToSpend({ widget }: WidgetProps<SafeToSpendData>) {
  const data = widget.data;

  return (
    <WidgetCard title="Safe to spend">
      <View style={styles.row}>
        <Text style={styles.label}>Per day</Text>
        <Money cents={data.safe_per_day_cents} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>This week</Text>
        <Money cents={data.safe_this_week_cents} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Until payday</Text>
        <Money cents={data.safe_total_cents} />
      </View>
      <Text style={styles.detail}>
        Payday {data.next_payday} · {data.days_until_payday} days
      </Text>
      <Text style={[styles.status, { color: STATUS_COLOR[data.status] }]}>{STATUS_LABEL[data.status]}</Text>
      <View style={styles.steps}>
        {data.steps.map((step) => (
          <View key={step.label} style={styles.row}>
            <Text style={styles.detail}>{step.label}</Text>
            <Money cents={step.amount_cents} signed />
          </View>
        ))}
      </View>
      <QuickLesson lesson={SAFE_TO_SPEND_LESSON} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: fontSize.small, color: colors.text },
  detail: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  status: { fontSize: fontSize.small, fontWeight: "600" },
  steps: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
