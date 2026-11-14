import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "@/theme";

import { ProgressBar } from "./ui";

export interface CompareRow {
  label: string;
  cents: number;
  color: string;
}

/** Two or more labelled bars on a shared scale. No chart library. */
export function CompareBars({ rows, formatCents }: { rows: CompareRow[]; formatCents: (c: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(0, r.cents)));
  return (
    <View style={styles.wrap}>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <View style={styles.head}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value}>{formatCents(r.cents)}</Text>
          </View>
          <ProgressBar fraction={Math.max(0, r.cents) / max} color={r.color} label={`${r.label} ${formatCents(r.cents)}`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { gap: 4 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  label: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, lineHeight: 18 },
});
