import { StyleSheet, Text, View } from "react-native";

import type { Transaction } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";

import { Money } from "./Money";

export function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={styles.left}>
        <Text style={styles.label}>{tx.label}</Text>
        <Text style={styles.date}>{tx.date}</Text>
      </View>
      <Money cents={tx.amount_cents} signed />
    </View>
  );
}

const styles = StyleSheet.create({
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
  date: { fontSize: fontSize.small - 3, color: colors.textSubtle },
});
