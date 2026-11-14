import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ChallengeSuggestions as ChallengeSuggestionsData, ChallengeTemplate } from "@/contracts";
import { postChatNote } from "@/chat/chatNote";
import type { WidgetHostApi, WidgetProps } from "@/chat/registry";
import { colors, fonts, spacing } from "@/theme";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { Body, Card, ErrorText, PrimaryButton, SecondaryButton, Title } from "./ui";

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/** Target amount of the experiment, when the rule has one. */
function targetCents(t: ChallengeTemplate): number | null {
  if (t.rule?.kind === "max_amount" && has(t.rule.amount_cents)) return t.rule.amount_cents;
  if (t.rule?.kind === "zero_spend") return 0;
  return null;
}

/** What the customer reads in the chat right after starting: what to do and how it works. */
export function startedNote(t: ChallengeTemplate, fmt: (c: number) => string, endDate?: string): string {
  const goal = targetCents(t);
  const before = has(t.baseline_cents) ? t.baseline_cents : null;
  const lines = [
    "Your 7-day challenge has started.",
    goal !== null
      ? `Your goal: spend no more than ${fmt(goal)} on this${endDate ? ` until ${endDate}` : " in the next 7 days"}.${
          before !== null ? ` Last week it was ${fmt(before)}.` : ""
        }`
      : "",
    "What you do: nothing special. Live as usual. I count your purchases for you. Nothing is blocked and no money moves.",
    "How it ends: after 7 days I compare with the week before and tell you if you reached your goal. A red dot on the bell shows when the result is ready.",
    "You can ask me any time: How is my challenge going?",
  ];
  return lines.filter(Boolean).join("\n\n");
}

function TemplateRow({ t, api }: { t: ChallengeTemplate; api: WidgetHostApi }) {
  const { start, loading, result, alreadyActive, notFound, errorMessage, errorStatus } = useStartChallenge(api);
  const fmt = api.formatCents;
  const target = targetCents(t);
  const baseline = has(t.baseline_cents) ? t.baseline_cents : null;
  useEffect(() => {
    if (result) postChatNote(startedNote(t, fmt, result.challenge?.end_date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  return (
    <Card label={t.title}>
      <View style={styles.item} testID={`challenge-${t.id}`}>
        <Text style={styles.itemTitle}>{t.title}</Text>
        {baseline !== null && target !== null ? (
          <Text
            style={styles.numbers}
            testID={`baseline-${t.id}`}
            accessibilityLabel={`Last 7 days ${fmt(baseline)}, Goal ${fmt(target)}`}
          >
            {`${fmt(baseline)} → ${fmt(target)}`}
          </Text>
        ) : null}
        {result ? (
          <>
            <Text style={styles.small} accessibilityLiveRegion="polite">
              Started
            </Text>
            <SecondaryButton label="Check progress" onPress={() => api.sendChat({ message: "How is my challenge going?" })} />
          </>
        ) : (
          <>
            {alreadyActive ? <ErrorText>You already have this challenge running.</ErrorText> : null}
            {notFound ? <ErrorText>This challenge is no longer available.</ErrorText> : null}
            {errorStatus !== null && !alreadyActive && !notFound ? (
              <ErrorText>{errorMessage ?? "Could not start the experiment."}</ErrorText>
            ) : null}
            <PrimaryButton
              label={loading ? "Starting..." : "Start the 7-day challenge"}
              accessibilityLabel={`Start the 7-day challenge: ${t.title}`}
              disabled={loading || alreadyActive || notFound}
              onPress={() => start(t.id)}
            />
          </>
        )}
      </View>
    </Card>
  );
}

/** One habit at a time keeps the choice simple. */
export function ChallengeSuggestions({ widget, api }: WidgetProps<ChallengeSuggestionsData>) {
  const first = (widget.data?.items ?? [])[0];
  if (!first) {
    return (
      <Card label="Habit experiment">
        <Title>Habit experiment</Title>
        <Body muted>No habit to test right now.</Body>
      </Card>
    );
  }
  return <TemplateRow t={first} api={api} />;
}

const styles = StyleSheet.create({
  item: { gap: spacing.sm },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, lineHeight: 22 },
  numbers: { fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 19 },
});
