import { StyleSheet, Text } from "react-native";

import type { LimitProgress as LimitProgressData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { colors, fonts } from "@/theme";

import { monthLabel, plural } from "./format";
import { Body, Card, ProgressBar, Title, danger } from "./ui";

const WARN = "#B7791F";

export function LimitProgress({ widget, api }: WidgetProps<LimitProgressData>) {
  const d = widget.data;
  if (!d?.limit) return null;
  const fmt = api.formatCents;
  const limit = d.limit.amount_cents;
  const over = d.status === "over" || d.spent_cents > limit;
  const color = over ? danger : d.status === "at_risk" ? WARN : colors.primary;
  const daysLeft = Math.max(0, d.days_in_month - d.days_elapsed);
  const fraction = limit > 0 ? d.spent_cents / limit : over ? 1 : 0;
  return (
    <Card label="Spending limit progress">
      <Title>{`Limit for ${monthLabel(d.limit.month)}`}</Title>
      <Text style={[styles.spent, { color }]} testID="limit-spent">
        {`${fmt(d.spent_cents)} of ${fmt(limit)}`}
      </Text>
      <ProgressBar fraction={fraction} color={color} label="Spent compared with limit" />
      <Body muted>
        {over
          ? `Over the limit by ${fmt(Math.abs(d.remaining_cents))}.`
          : `${fmt(d.remaining_cents)} left.`}
      </Body>
      <Body muted>{`${plural(daysLeft, "day", "days")} left this month.`}</Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  spent: { fontFamily: fonts.bold, fontSize: 22 },
});
