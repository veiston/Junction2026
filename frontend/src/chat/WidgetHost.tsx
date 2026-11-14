import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Widget } from "@/contracts";
import { coachColors, colors, fonts, fontSize } from "@/theme";
import { TransactionList } from "@/widgets/common/TransactionList";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { postChatAsk } from "./chatAsk";
import { registry, type WidgetHostApi } from "./registry";

interface Props {
  widget: Widget;
  api: WidgetHostApi;
  /** Chat-screen override for the transaction_list "See all" button. */
  onSeeAll?: (data: Widget["data"]) => void;
}

interface Ask {
  /** The question on the button, also shown as the customer's message. */
  label: string;
  /** The card's own numbers, sent with the question so the assistant answers from them. */
  answer?: string;
}

type Dict = Record<string, unknown>;
type Challenge = { status?: string; end_date?: string; rule?: { amount_cents?: number | null } };
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * One purpose for the challenge cards: spend less on one habit by testing a small change for a week.
 * The buttons are the questions the customer has at that moment; each is answered from the card's own numbers.
 */
export function asksFor(widget: Widget, fmt: (cents: number) => string): Ask[] {
  const d = widget.data as unknown as Dict | null;
  if (widget.type === "challenge_suggestions") {
    const first = (d?.items as Dict[] | undefined)?.[0];
    const goal = num((first?.rule as { amount_cents?: number | null } | undefined)?.amount_cents);
    const reason = typeof first?.reason === "string" ? first.reason : null;
    if (!first || goal === null || !reason) return [{ label: "Why this challenge?" }];
    const saving = num(first.estimated_saving_cents) ?? 0;
    const yearly = num(first.yearly_saving_cents);
    return [
      {
        label: "Why this habit?",
        answer: `${reason} It is a regular everyday cost, so a small change shows up quickly.`,
      },
      {
        label: "Why this goal?",
        answer: `Your goal is half of last week: ${fmt(goal)}, rounded down to whole euros. It is a realistic first step, not a punishment.`,
      },
      {
        label: "What do I gain?",
        answer: `If you reach the goal, you keep about ${fmt(saving)} this week${yearly !== null ? `, roughly ${fmt(yearly)} a year if you keep it up (an estimate)` : ""}.`,
      },
      {
        label: "How does it work?",
        answer:
          "It lasts 7 days. I count your purchases for you. Nothing is blocked and no money moves. " +
          "After 7 days I compare with the week before and tell you if you reached your goal. " +
          "This way of checking is called comparing equal periods: same length, same weekdays, so it is fair.",
      },
    ];
  }
  if (widget.type === "challenge_progress") {
    const c = (d?.challenge ?? {}) as Challenge;
    const goal = c.rule?.amount_cents;
    const current = num(d?.current_amount_cents) ?? 0;
    const before = num(d?.baseline_cents);
    const days = num(d?.days_left);
    if (c.status === "won" || c.status === "lost") {
      const won = c.status === "won";
      const compare = before !== null ? `You spent ${fmt(current)} this week and ${fmt(before)} the week before.` : `You spent ${fmt(current)} this week.`;
      return [
        {
          label: "What next?",
          answer: won
            ? "Repeat it once more to make it a habit, or try another challenge."
            : "That is fine. Try again for 7 days or pick another challenge.",
        },
        {
          label: "What does the result mean?",
          answer: `${compare} ${won ? "You reached your goal." : "You did not reach your goal this time."}`,
        },
        {
          label: "Is one good week enough?",
          answer: "One good week is a good sign, not proof of a new habit. Repeating it tells you more.",
        },
      ];
    }
    return [
      {
        label: "What do I do now?",
        answer: "Nothing special: live as usual and I count your purchases. Nothing is blocked and no money moves.",
      },
      {
        label: "How am I doing?",
        answer:
          `So far you spent ${fmt(current)}${typeof goal === "number" ? ` of ${fmt(goal)}` : ""}` +
          `${days !== null ? `, ${days} ${days === 1 ? "day" : "days"} left` : ""}. ` +
          (d?.on_track === false ? "At this pace you may go over, so a skipped purchase would help." : "You are on track."),
      },
      {
        label: "How will I know I won?",
        answer: `If you spend no more than ${typeof goal === "number" ? fmt(goal) : "the goal"}${c.end_date ? ` until ${c.end_date}` : ""}, you reached it. I compare with the week before (comparing equal periods).`,
      },
      {
        label: "What if I go over?",
        answer: "Nothing bad happens. It shows as not reached, and you can try again or pick another challenge.",
      },
    ];
  }
  return [];
}

function ExplainButtons({ widget, api }: { widget: Widget; api: WidgetHostApi }) {
  const asks = asksFor(widget, api.formatCents);
  if (asks.length === 0) return null; // only cards with real questions get buttons
  return (
    <View style={styles.chips} testID="explain-buttons">
      {asks.map((ask) => (
        <Pressable
          key={ask.label}
          accessibilityRole="button"
          accessibilityLabel={ask.label}
          hitSlop={4}
          onPress={() => {
            if (ask.answer && postChatAsk(ask.label, ask.answer)) return;
            api.sendChat({ message: ask.label });
          }}
          style={styles.chip}
        >
          <Text style={styles.chipText}>{ask.label}</Text>
        </Pressable>
      ))}
    </View>
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
      {widget.type === "concept_note" ? null : <ExplainButtons widget={widget} api={api} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  chip: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  fallback: { fontSize: fontSize.small, color: colors.textMuted },
});
