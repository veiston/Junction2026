import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { SpendingSummary } from "@/contracts";
import { formatCents } from "@/widgets/common/Money";
import { SourceLine } from "@/widgets/common/SourceLine";
import { TransactionRow } from "@/widgets/common/TransactionRow";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { u } from "./styles";

function comparison(now: number, before: number): string {
  if (before === 0) return now === 0 ? "Nothing in the previous period either." : "Nothing in the previous period.";
  const diff = now - before;
  if (diff === 0) return "Same as the previous period.";
  return `${formatCents(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the previous period (${formatCents(before)}).`;
}

/** `footer` is where the interactive widget puts "See all" and the full list. */
export function SpendingSummaryView({ data, footer }: { data: SpendingSummary; footer?: ReactNode }) {
  const { query } = data;
  return (
    <WidgetCard title={`${data.label} · ${query.from_date} – ${query.to_date}`}>
      <Text style={u.big} testID="spending-amount">
        {formatCents(data.amount_cents)}
      </Text>
      <Text style={u.muted}>
        {data.tx_count} {data.tx_count === 1 ? "purchase" : "purchases"}
        {data.tx_count > 0 ? ` · average ${formatCents(data.average_tx_cents)}` : ""}
      </Text>
      <Text style={u.subtle}>{comparison(data.amount_cents, data.previous_period_amount_cents)}</Text>
      {data.sample_transactions.length > 0 && (
        <View>
          <Text style={u.strong}>Largest purchases</Text>
          {data.sample_transactions.map((t) => (
            <TransactionRow key={t.id} tx={t} />
          ))}
        </View>
      )}
      {footer}
      <SourceLine source={data.source} />
    </WidgetCard>
  );
}
