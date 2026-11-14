import { StyleSheet, Text, View } from "react-native";

import type { ChallengeSuggestions as ChallengeSuggestionsData, ChallengeTemplate } from "@/contracts";
import type { WidgetHostApi, WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";
import { ConceptNoteBody } from "@/widgets/common/ConceptNote";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { CompareBars } from "./CompareBars";
import { plural } from "./format";
import { ruleText } from "./ruleText";
import { Body, Card, ErrorText, PrimaryButton, Title } from "./ui";

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/** Target amount of the experiment, when the rule has one. */
function targetCents(t: ChallengeTemplate): number | null {
  if (t.rule?.kind === "max_amount" && has(t.rule.amount_cents)) return t.rule.amount_cents;
  if (t.rule?.kind === "zero_spend") return 0;
  return null;
}

function TemplateRow({ t, api }: { t: ChallengeTemplate; api: WidgetHostApi }) {
  const { start, loading, result, alreadyActive, notFound, errorMessage, errorStatus } = useStartChallenge(api);
  const fmt = api.formatCents;
  const target = targetCents(t);
  const baseline = has(t.baseline_cents) ? t.baseline_cents : null;
  return (
    <View style={styles.item} testID={`challenge-${t.id}`}>
      <Text style={styles.itemTitle}>{t.title}</Text>
      {t.reason ? <Body muted>{t.reason}</Body> : null}
      {t.description ? <Body muted>{t.description}</Body> : null}
      <Body muted>{`${ruleText(t.rule, fmt)} - ${plural(t.duration_days, "day", "days")}`}</Body>
      {baseline !== null && target !== null ? (
        <View testID={`baseline-${t.id}`}>
          <CompareBars
            formatCents={fmt}
            rows={[
              {
                label: has(t.baseline_count)
                  ? `Before: last 7 days (${plural(t.baseline_count, "purchase", "purchases")})`
                  : "Before: last 7 days",
                cents: baseline,
                color: coachColors.border,
              },
              { label: "Target: next 7 days", cents: target, color: colors.primary },
            ]}
          />
        </View>
      ) : baseline !== null ? (
        <Body muted>{`Last 7 days: ${fmt(baseline)}`}</Body>
      ) : null}
      <Text style={styles.saving}>{`Possible saving: ${fmt(t.estimated_saving_cents)}`}</Text>
      {has(t.yearly_saving_cents) ? (
        <Body muted>{`Estimate: about ${fmt(t.yearly_saving_cents)} a year if you kept this up.`}</Body>
      ) : null}
      {t.concept ? <ConceptNoteBody note={t.concept} /> : null}
      {result ? (
        <Text style={styles.started} accessibilityLiveRegion="polite">
          Experiment started
        </Text>
      ) : (
        <>
          {alreadyActive ? <ErrorText>You already have this challenge running.</ErrorText> : null}
          {notFound ? <ErrorText>This challenge is no longer available.</ErrorText> : null}
          {errorStatus !== null && !alreadyActive && !notFound ? (
            <ErrorText>{errorMessage ?? "Could not start the experiment."}</ErrorText>
          ) : null}
          <PrimaryButton
            label={loading ? "Starting..." : "Start experiment"}
            accessibilityLabel={`Start experiment: ${t.title}`}
            disabled={loading || alreadyActive || notFound}
            onPress={() => start(t.id)}
          />
        </>
      )}
    </View>
  );
}

export function ChallengeSuggestions({ widget, api }: WidgetProps<ChallengeSuggestionsData>) {
  const items = (widget.data?.items ?? []).slice(0, 3);
  if (items.length === 0) {
    return (
      <Card label="Habit experiment">
        <Title>Habit experiment</Title>
        <Body muted>No habit to test right now.</Body>
      </Card>
    );
  }
  return (
    <Card label="Habit experiment">
      <Title>Try a 7-day experiment</Title>
      {items.map((t) => (
        <TemplateRow key={t.id} t={t} api={api} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderColor: coachColors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  saving: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  started: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
});
