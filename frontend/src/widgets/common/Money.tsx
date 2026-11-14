import { StyleSheet, Text } from "react-native";

import { colors, fontSize } from "@/theme";

const fmt = new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" });

/** Integer cents -> "1 234,56 €" (fi-FI). */
export function formatCents(cents: number): string {
  return fmt.format(cents / 100);
}

export function Money({ cents, signed = false }: { cents: number; signed?: boolean }) {
  const color = signed ? (cents < 0 ? colors.text : colors.primary) : colors.text;
  return <Text style={[styles.money, { color }]}>{formatCents(cents)}</Text>;
}

const styles = StyleSheet.create({
  money: { fontSize: fontSize.small, fontVariant: ["tabular-nums"] },
});
