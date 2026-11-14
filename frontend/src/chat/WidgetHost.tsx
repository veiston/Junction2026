import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Widget } from "@/contracts";
import { Icon } from "@/components/Icon";
import { colors, fonts, fontSize } from "@/theme";
import { TransactionList } from "@/widgets/common/TransactionList";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { registry, type WidgetHostApi } from "./registry";

interface Props {
  widget: Widget;
  api: WidgetHostApi;
  /** Chat-screen override for the transaction_list "See all" button. */
  onSeeAll?: (data: Widget["data"]) => void;
}

/** The concept a widget carries, if any (card level or first suggestion). */
function conceptOf(data: unknown): { id: string; title: string } | null {
  type C = { id?: string; title?: string } | null | undefined;
  const d = data as { concept?: C; items?: { concept?: C }[] } | null | undefined;
  const c = d?.concept ?? (Array.isArray(d?.items) ? d?.items?.find((i) => i?.concept?.id)?.concept : undefined);
  return c?.id && c.title ? { id: c.id, title: c.title } : null;
}

const CARD_NAMES: Record<string, string> = {
  transaction_list: "my latest transactions",
  spending_summary: "my spending summary",
  basket_breakdown: "my spending by category",
  basket_trend: "my spending trend",
  peer_benchmark: "how I compare with others",
  spender_profile: "my spending profile",
  balance_forecast: "my balance forecast",
  safe_to_spend: "what is safe to spend",
  upcoming_bills: "my upcoming bills",
  expense_alerts: "my spending alerts",
  what_if: "this what-if",
  limit_suggestion: "the monthly limit",
  limit_progress: "my limit progress",
  limit_review: "my limit review",
  challenge_suggestions: "the 7-day experiment",
  challenge_progress: "my experiment",
};

/** What the customer sees in the chat: plain words, never internal names. */
export function explainMessage(widget: Widget, formatCents?: (cents: number) => string): string {
  if (widget.type === "challenge_suggestions" && formatCents) {
    const first = (widget.data as { items?: { rule?: { amount_cents?: number | null }; baseline_cents?: number | null }[] })
      ?.items?.[0];
    const goal = first?.rule?.amount_cents;
    const before = first?.baseline_cents;
    if (typeof goal === "number" && typeof before === "number") {
      return `Why is my goal ${formatCents(goal)} when I spent ${formatCents(before)} last week?`;
    }
  }
  const concept = conceptOf(widget.data);
  if (concept) return `Explain in simple words: ${concept.title}`;
  return `Explain in simple words: ${CARD_NAMES[widget.type] ?? "this card"}`;
}

/** A question the customer would ask, not a command word. */
const ASK_LABEL: Record<string, string> = {
  challenge_suggestions: "Why this goal?",
  challenge_progress: "Why does this matter?",
};

function ExplainButton({ widget, api }: { widget: Widget; api: WidgetHostApi }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Explain this card"
      onPress={() => api.sendChat({ message: explainMessage(widget, api.formatCents) })}
      style={styles.explain}
      testID="explain-button"
    >
      <Icon name="lightbulb-on-outline" size={16} />
      <Text style={styles.explainText}>{ASK_LABEL[widget.type] ?? "What does this mean?"}</Text>
    </Pressable>
  );
}

function Rendered({ widget, api, onSeeAll }: Props) {
  const Component = registry[widget.type];
  if (!Component) {
    return (
      <WidgetCard>
        <Text style={styles.fallback} testID="widget-fallback">
          This view is coming soon.
        </Text>
      </WidgetCard>
    );
  }
  if (Component === TransactionList) {
    return <TransactionList widget={widget as never} api={api} onSeeAll={onSeeAll as never} />;
  }
  return <Component widget={widget as never} api={api} />;
}

export function WidgetHost(props: Props) {
  const { widget, api } = props;
  return (
    <View style={styles.wrap}>
      <Rendered {...props} />
      {widget.type === "concept_note" ? null : <ExplainButton widget={widget} api={api} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  explain: {
    minHeight: 44,
    minWidth: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  explainText: { fontFamily: fonts.semibold, fontSize: fontSize.small, color: colors.primary },
  fallback: { fontSize: fontSize.small, color: colors.textMuted },
});
