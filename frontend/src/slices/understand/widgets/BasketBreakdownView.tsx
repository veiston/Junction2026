import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Basket, BasketBreakdown } from "@/contracts";
import { colors, radius, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";
import { SourceLine } from "@/widgets/common/SourceLine";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { basketColor, basketHint, basketLabel, changeText, monthLabel, pct } from "../format";
import { u } from "./styles";

interface Props {
  data: BasketBreakdown;
  /** Tap on a basket row, e.g. to ask the coach about it. */
  onSelectBasket?: (basket: Basket) => void;
  /** Slot for the month switcher (added by the interactive widget). */
  controls?: ReactNode;
}

export function BasketBreakdownView({ data, onSelectBasket, controls }: Props) {
  const title = `Your three baskets · ${monthLabel(data.month)}${data.is_partial_month ? " so far" : ""}`;
  return (
    <WidgetCard title={title}>
      {controls}
      <View style={u.row}>
        <Text style={u.muted}>Spent</Text>
        <Text style={u.big} testID="breakdown-total">
          {formatCents(data.total_spending_cents)}
        </Text>
      </View>

      <View style={styles.bar} accessibilityLabel="Share of each basket">
        {data.baskets.map((b) =>
          b.share_pct > 0 ? (
            <View key={b.basket} style={{ flex: b.share_pct, backgroundColor: basketColor[b.basket] }} />
          ) : null,
        )}
      </View>

      {data.baskets.map((b) => (
        <Pressable
          key={b.basket}
          accessibilityRole="button"
          accessibilityLabel={`${basketLabel[b.basket]}: ${formatCents(b.amount_cents)}, ${pct(b.share_pct)}`}
          disabled={!onSelectBasket}
          onPress={() => onSelectBasket?.(b.basket)}
          style={styles.basket}
        >
          <View style={u.row}>
            <View style={styles.name}>
              <View style={[u.dot, { backgroundColor: basketColor[b.basket] }]} />
              <Text style={u.strong}>{basketLabel[b.basket]}</Text>
            </View>
            <Text style={u.strong}>{formatCents(b.amount_cents)}</Text>
          </View>
          <View style={u.row}>
            <Text style={u.subtle}>{basketHint[b.basket]}</Text>
            <Text style={u.muted}>
              {pct(b.share_pct)} · {b.tx_count} pcs
            </Text>
          </View>
          {(b.amount_cents > 0 || b.previous_amount_cents > 0) && (
            <Text style={u.subtle}>{changeText(b.change_pct)}</Text>
          )}
          {b.top_groups.length > 0 && (
            <Text style={u.subtle}>
              {b.top_groups
                .slice(0, 3)
                .map((g) => `${g.label} ${formatCents(g.amount_cents)}`)
                .join(" · ")}
            </Text>
          )}
        </Pressable>
      ))}

      <View style={u.divider} />
      <View style={u.row}>
        <Text style={u.muted}>Income {formatCents(data.income_cents)}</Text>
        <Text style={u.muted}>Saved {formatCents(data.saving_cents)}</Text>
      </View>
      <SourceLine source={data.source} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 14,
    borderRadius: radius.round,
    overflow: "hidden",
    backgroundColor: colors.placeholder,
  },
  basket: { gap: 2, paddingVertical: spacing.xs, minHeight: 44 },
  name: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
