import { StyleSheet, Text, View } from "react-native";

import type { ChallengeProgress as ChallengeProgressData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, spacing } from "@/theme";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { CompareBars } from "./CompareBars";
import { plural } from "./format";
import { Body, Card, ErrorText, PrimaryButton, ProgressBar, SecondaryButton, Title } from "./ui";

export const ANOTHER_HABIT_MESSAGE = "Show me another challenge to try";

export const PROGRESS_MESSAGE = "How is my challenge going?";

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

export function ChallengeProgress({ widget, api }: WidgetProps<ChallengeProgressData>) {
  const d = widget.data;
  const start = useStartChallenge(api);
  if (!d?.challenge) return null;
  const c = d.challenge;
  const fmt = api.formatCents;
  const finished = c.status === "won" || c.status === "lost";
  const current = has(d.current_amount_cents) ? d.current_amount_cents : 0;
  const baseline = has(d.baseline_cents) ? d.baseline_cents : null;

  const header = <Title>{c.title}</Title>;

  if (!finished) {
    const target = c.rule?.kind === "max_amount" && has(c.rule.amount_cents) ? c.rule.amount_cents : null;
    const behind = c.status === "active" && !d.on_track;
    const color = behind ? colors.textMuted : colors.primary;
    return (
      <Card label="Experiment progress">
        {header}
        {target !== null ? (
          <>
            <CompareBars
              formatCents={fmt}
              rows={[
                { label: "Spent so far", cents: current, color },
                { label: "Your goal", cents: target, color: coachColors.border },
              ]}
            />
          </>
        ) : (
          <ProgressBar fraction={(d.progress_pct ?? 0) / 100} color={color} label="Experiment progress" />
        )}
        {c.status === "active" ? (
          <Body muted>
            {`${plural(d.days_left ?? 0, "day", "days")} left · ${d.on_track ? "doing well" : "careful"}`}
          </Body>
        ) : (
          <Body muted>{`${c.start_date} to ${c.end_date}`}</Body>
        )}
        {c.status === "active" ? (
          <SecondaryButton label="Try a new challenge" onPress={() => api.sendChat({ message: ANOTHER_HABIT_MESSAGE })} />
        ) : null}
      </Card>
    );
  }

  const won = c.status === "won";
  const diff = has(d.difference_cents) ? d.difference_cents : baseline !== null ? baseline - current : null;
  return (
    <Card label="Experiment result">
      {header}
      <View style={[styles.verdict, won ? styles.verdictMet : styles.verdictNotMet]} testID="challenge-verdict">
        <Text style={[styles.verdictText, { color: won ? colors.primary : colors.textMuted }]}>{won ? "You reached your goal" : "You did not reach your goal this time"}</Text>
      </View>
      {baseline !== null ? (
        <CompareBars
          formatCents={fmt}
          rows={[
            { label: "Week before", cents: baseline, color: coachColors.border },
            { label: "This week", cents: current, color: won ? colors.primary : colors.textMuted },
          ]}
        />
      ) : (
        <Body muted>{`Spent in the experiment: ${fmt(current)}`}</Body>
      )}
      {diff !== null ? (
        <Text style={[styles.diff, { color: diff >= 0 ? colors.primary : colors.textMuted }]} testID="challenge-difference">
          {diff >= 0
            ? `You spent ${fmt(diff)} less than the week before.`
            : `You spent ${fmt(-diff)} more than the week before.`}
        </Text>
      ) : null}
      {start.result ? (
        <Text style={styles.verdict} accessibilityLiveRegion="polite">
          Started
        </Text>
      ) : (
        <View style={styles.actions}>
          {start.errorStatus !== null ? (
            <ErrorText>
              {start.alreadyActive
                ? "You already have this challenge running."
                : start.notFound
                  ? "This challenge is no longer available."
                  : (start.errorMessage ?? "Could not start the experiment.")}
            </ErrorText>
          ) : null}
          <PrimaryButton
            label={start.loading ? "Starting..." : "Try again for 7 days"}
            disabled={start.loading || start.alreadyActive || start.notFound}
            onPress={() => start.start(c.template_id)}
          />
          <SecondaryButton label="Try a new challenge" onPress={() => api.sendChat({ message: ANOTHER_HABIT_MESSAGE })} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  verdict: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  verdictMet: { backgroundColor: coachColors.surfaceMuted },
  verdictNotMet: { backgroundColor: coachColors.surfaceMuted },
  verdictText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  diff: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  actions: { gap: spacing.sm },
});
