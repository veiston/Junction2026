import { StyleSheet, Text, View } from "react-native";

import type { ChallengeSuggestions as ChallengeSuggestionsData, ChallengeTemplate } from "@/contracts";
import type { WidgetHostApi, WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { plural } from "./format";
import { ruleText } from "./ruleText";
import { Body, Card, ErrorText, PrimaryButton, Title } from "./ui";

function TemplateRow({ t, api }: { t: ChallengeTemplate; api: WidgetHostApi }) {
  const { start, loading, result, alreadyActive, notFound, errorMessage, errorStatus } = useStartChallenge(api);
  const fmt = api.formatCents;
  return (
    <View style={styles.item} testID={`challenge-${t.id}`}>
      <Text style={styles.itemTitle}>{t.title}</Text>
      <Body muted>{t.description}</Body>
      <Body muted>{`${ruleText(t.rule, fmt)} - ${plural(t.duration_days, "day", "days")}`}</Body>
      <Body muted>{t.reason}</Body>
      <Text style={styles.saving}>{`Possible saving: ${fmt(t.estimated_saving_cents)}`}</Text>
      {result ? (
        <Text style={styles.started} accessibilityLiveRegion="polite">
          Challenge started
        </Text>
      ) : (
        <>
          {alreadyActive ? <ErrorText>You already have this challenge running.</ErrorText> : null}
          {notFound ? <ErrorText>This challenge is no longer available.</ErrorText> : null}
          {errorStatus !== null && !alreadyActive && !notFound ? (
            <ErrorText>{errorMessage ?? "Could not start the challenge."}</ErrorText>
          ) : null}
          <PrimaryButton
            label={loading ? "Starting..." : "Start"}
            accessibilityLabel={`Start ${t.title}`}
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
      <Card label="Challenge suggestions">
        <Title>Challenges</Title>
        <Body muted>No challenges to suggest right now.</Body>
      </Card>
    );
  }
  return (
    <Card label="Challenge suggestions">
      <Title>Try a challenge</Title>
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
  saving: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary, marginBottom: spacing.xs },
  started: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
});
