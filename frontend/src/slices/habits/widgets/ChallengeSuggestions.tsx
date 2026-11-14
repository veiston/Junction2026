import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ChallengeSuggestions as ChallengeSuggestionsData, ChallengeTemplate } from "@/contracts";
import { postChatAsk } from "@/chat/chatAsk";
import type { WidgetHostApi, WidgetProps } from "@/chat/registry";
import { colors, fonts, spacing } from "@/theme";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { StopChallenge } from "./StopChallenge";
import { Body, Card, ErrorText, PrimaryButton, SecondaryButton, Title } from "./ui";

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/** Target amount of the experiment, when the rule has one. */
function targetCents(t: ChallengeTemplate): number | null {
  if (t.rule?.kind === "max_amount" && has(t.rule.amount_cents)) return t.rule.amount_cents;
  if (t.rule?.kind === "zero_spend") return 0;
  return null;
}

/** The facts the assistant needs to explain, in its own words, what happens after Start. */
export function startedFacts(t: ChallengeTemplate, fmt: (c: number) => string, endDate?: string): string {
  const goal = targetCents(t);
  const before = has(t.baseline_cents) ? t.baseline_cents : null;
  return [
    "The customer just started a 7-day challenge to spend less on one everyday habit.",
    goal !== null ? `Goal: spend no more than ${fmt(goal)} on it${endDate ? ` until ${endDate}` : " in the next 7 days"}.` : "",
    before !== null ? `Last week they spent ${fmt(before)} on it.` : "",
    "They do nothing special. Purchases are counted automatically, nothing is blocked and no money moves.",
    "After 7 days the week is compared with the week before (this is called comparing equal periods: same length, same weekdays, so it is fair) and the result is shown. A red dot on the bell shows when it is ready.",
    "They can ask how the challenge is going at any time.",
  ].filter(Boolean).join(" ");
}

function TemplateRow({ t, api }: { t: ChallengeTemplate; api: WidgetHostApi }) {
  const { start, loading, result, alreadyActive, notFound, errorMessage, errorStatus } = useStartChallenge(api);
  const [stopped, setStopped] = useState(false);
  const fmt = api.formatCents;
  const target = targetCents(t);
  const baseline = has(t.baseline_cents) ? t.baseline_cents : null;
  useEffect(() => {
    if (result) postChatAsk("I started the challenge. What happens now?", startedFacts(t, fmt, result.challenge?.end_date));
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
        {result && stopped ? (
          <Text style={styles.small} accessibilityLiveRegion="polite">
            Challenge stopped. You can start another one.
          </Text>
        ) : result ? (
          <>
            <Text style={styles.small} accessibilityLiveRegion="polite">
              Started
            </Text>
            <View style={styles.actions}>
              <SecondaryButton label="Check progress" onPress={() => api.sendChat({ message: "How is my challenge going?" })} />
              {result.challenge ? (
                <StopChallenge api={api} challengeId={result.challenge.id} title={t.title} spentCents={result.current_amount_cents ?? 0} daysLeft={result.days_left ?? null} onStopped={() => setStopped(true)} />
              ) : null}
            </View>
          </>
        ) : (
          <>
            {alreadyActive ? <ErrorText>You already have this challenge running.</ErrorText> : null}
            {notFound ? <ErrorText>This challenge is no longer available.</ErrorText> : null}
            {errorStatus !== null && !alreadyActive && !notFound ? (
              <ErrorText>{errorMessage ?? "Could not start the experiment."}</ErrorText>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton
                label={loading ? "Starting..." : "Start the 7-day challenge"}
                accessibilityLabel={`Start the 7-day challenge: ${t.title}`}
                disabled={loading || alreadyActive || notFound}
                onPress={() => start(t.id)}
              />
              <SecondaryButton label="Another challenge" onPress={() => api.sendChat({ message: "Show me another challenge to try" })} />
            </View>
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  small: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 19 },
});
