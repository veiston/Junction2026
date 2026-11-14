import { StyleSheet, Text } from "react-native";

import type { LimitReview as LimitReviewData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { colors, fonts } from "@/theme";

import { monthLabel } from "./format";
import { Body, Card, Title, danger } from "./ui";

export function LimitReview({ widget, api }: WidgetProps<LimitReviewData>) {
  const d = widget.data;
  if (!d?.limit) return null;
  const fmt = api.formatCents;
  const met = d.met;
  const diff = Math.abs(d.difference_cents);
  return (
    <Card label="Limit review">
      <Title>{`${monthLabel(d.limit.month)} review`}</Title>
      <Text style={[styles.result, { color: met ? colors.primary : danger }]} testID="limit-review-result">
        {met ? `Under the limit, saved ${fmt(diff)}` : `Over the limit by ${fmt(diff)}`}
      </Text>
      <Body>{`Spent ${fmt(d.final_spent_cents)} of ${fmt(d.limit.amount_cents)}.`}</Body>
      <Body muted>{`The month before you spent ${fmt(d.previous_month_cents)}.`}</Body>
      {d.biggest_leak ? (
        <Body muted>{`Biggest area: ${d.biggest_leak.label} (${fmt(d.biggest_leak.amount_cents)}).`}</Body>
      ) : null}
      {d.best_week_start ? <Body muted>{`Best week started on ${d.best_week_start}.`}</Body> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  result: { fontFamily: fonts.bold, fontSize: 20 },
});
