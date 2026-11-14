import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BasketTrend } from "@/contracts";
import { colors, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";
import { SourceLine } from "@/widgets/common/SourceLine";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { BASKETS, basketColor, basketLabel, monthLabel, monthShort } from "../format";
import { u } from "./styles";

const CHART_HEIGHT = 140;

/** True when the last month of the trend is still in progress (its data stops before month end). */
export function lastMonthIsPartial(data: BasketTrend): boolean {
  const last = data.months[data.months.length - 1]?.month;
  const to = data.source.period.to_date;
  if (!last || !to.startsWith(last)) return false;
  const [y, m] = last.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Number(to.slice(8, 10)) < daysInMonth;
}

export function BasketTrendView({ data, controls }: { data: BasketTrend; controls?: ReactNode }) {
  const totals = data.months.map((m) => m.baskets.reduce((s, b) => s + b.amount_cents, 0));
  const max = Math.max(1, ...totals);
  const partial = lastMonthIsPartial(data);
  const first = data.months[0].month;
  const last = data.months[data.months.length - 1].month;

  return (
    <WidgetCard title={`Basket trend · ${monthLabel(first)} – ${monthLabel(last)}`}>
      {controls}
      <View style={styles.chart} accessibilityLabel="Monthly spending per basket">
        {data.months.map((m, i) => {
          const isPartial = partial && i === data.months.length - 1;
          return (
            <View key={m.month} style={styles.col} testID={`trend-${m.month}`}>
              <Text style={u.subtle} numberOfLines={1}>
                {Math.round(totals[i] / 100)}
              </Text>
              <View style={[styles.stack, { height: (totals[i] / max) * CHART_HEIGHT }, isPartial && styles.partial]}>
                {[...m.baskets].reverse().map((b) =>
                  b.amount_cents > 0 ? (
                    <View key={b.basket} style={{ flex: b.amount_cents, backgroundColor: basketColor[b.basket] }} />
                  ) : null,
                )}
              </View>
              <Text style={u.muted}>
                {monthShort(m.month)}
                {isPartial ? "*" : ""}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {BASKETS.map((b) => (
          <View key={b} style={styles.legendItem}>
            <View style={[u.dot, { backgroundColor: basketColor[b] }]} />
            <Text style={u.subtle}>{basketLabel[b]}</Text>
          </View>
        ))}
      </View>
      {partial && <Text style={u.subtle}>* {monthLabel(last)} is still in progress (so far: {formatCents(totals[totals.length - 1])}).</Text>}
      <SourceLine source={data.source} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs, minHeight: CHART_HEIGHT + 40 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 2 },
  stack: { width: "70%", borderRadius: 4, overflow: "hidden", backgroundColor: colors.placeholder, minHeight: 2 },
  partial: { opacity: 0.55 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
