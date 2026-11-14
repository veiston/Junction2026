import { StyleSheet, Text, View } from "react-native";

import type { ChallengeProgress as ChallengeProgressData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, spacing } from "@/theme";
import { ConceptNoteBody } from "@/widgets/common/ConceptNote";

import { useStartChallenge } from "../hooks/useStartChallenge";
import { CompareBars } from "./CompareBars";
import { plural } from "./format";
import { ruleText } from "./ruleText";
import { Body, Card, ErrorText, PrimaryButton, ProgressBar, Title, danger } from "./ui";

export const ANOTHER_HABIT_MESSAGE = "Show me another habit to test";

const STATUS: Record<string, { text: string; color: string }> = {
  active: { text: "Active", color: colors.primary },
  won: { text: "Won", color: colors.primary },
  lost: { text: "Lost", color: danger },
  cancelled: { text: "Cancelled", color: colors.textMuted },
};

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

function pctText(changePct: number): string {
  // change_pct > 0 means spending went down, so the displayed change is its opposite.
  const shown = -changePct;
  const abs = Math.abs(shown).toFixed(1).replace(".", ",");
  return `${shown > 0 ? "+" : shown < 0 ? "-" : ""}${abs} %`;
}

export function ChallengeProgress({ widget, api }: WidgetProps<ChallengeProgressData>) {
  const d = widget.data;
  const start = useStartChallenge(api);
  if (!d?.challenge) return null;
  const c = d.challenge;
  const fmt = api.formatCents;
  const status = STATUS[c.status] ?? STATUS.active;
  const finished = c.status === "won" || c.status === "lost";
  const current = has(d.current_amount_cents) ? d.current_amount_cents : 0;
  const baseline = has(d.baseline_cents) ? d.baseline_cents : null;

  const header = (
    <>
      <Title>{c.title}</Title>
      <Text style={[styles.status, { color: status.color }]} testID="challenge-status">
        {status.text}
      </Text>
      <Body muted>{ruleText(c.rule, fmt)}</Body>
    </>
  );

  if (!finished) {
    const target = c.rule?.kind === "max_amount" && has(c.rule.amount_cents) ? c.rule.amount_cents : null;
    const behind = c.status === "active" && !d.on_track;
    const color = behind ? danger : colors.primary;
    return (
      <Card label="Experiment progress">
        {header}
        {target !== null ? (
          <>
            <CompareBars
              formatCents={fmt}
              rows={[
                { label: "Spent so far", cents: current, color },
                { label: "Target", cents: target, color: coachColors.border },
              ]}
            />
          </>
        ) : (
          <ProgressBar fraction={(d.progress_pct ?? 0) / 100} color={color} label="Experiment progress" />
        )}
        {c.status === "active" ? (
          <Body muted>
            {`${plural(d.days_left ?? 0, "day", "days")} left, ${d.on_track ? "on track" : "at risk"}.`}
          </Body>
        ) : (
          <Body muted>{`${c.start_date} to ${c.end_date}`}</Body>
        )}
        {d.concept ? <ConceptNoteBody note={d.concept} /> : null}
      </Card>
    );
  }

  const won = c.status === "won";
  const diff = has(d.difference_cents) ? d.difference_cents : baseline !== null ? baseline - current : null;
  return (
    <Card label="Experiment result">
      {header}
      <Text style={[styles.verdict, { color: won ? colors.primary : danger }]} testID="challenge-verdict">
        {won ? "Target met" : "Target not met"}
      </Text>
      {baseline !== null ? (
        <CompareBars
          formatCents={fmt}
          rows={[
            { label: "Before", cents: baseline, color: coachColors.border },
            { label: "Now", cents: current, color: won ? colors.primary : danger },
          ]}
        />
      ) : (
        <Body muted>{`Spent in the experiment: ${fmt(current)}`}</Body>
      )}
      {diff !== null ? (
        <Text style={[styles.diff, { color: diff >= 0 ? colors.primary : danger }]} testID="challenge-difference">
          {diff >= 0
            ? `You spent ${fmt(diff)} less than before.`
            : `Spending increased by ${fmt(-diff)} compared with before.`}
        </Text>
      ) : null}
      {has(d.change_pct) ? (
        <Body muted>{`Change in spending: ${pctText(d.change_pct)}`}</Body>
      ) : null}
      {d.concept ? <ConceptNoteBody note={d.concept} /> : null}
      {d.next_step ? <Body>{d.next_step}</Body> : null}
      {start.result ? (
        <Text style={styles.verdict} accessibilityLiveRegion="polite">
          Experiment started
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
            label={start.loading ? "Starting..." : "Repeat for 7 days"}
            disabled={start.loading || start.alreadyActive || start.notFound}
            onPress={() => start.start(c.template_id)}
          />
          <PrimaryButton label="Try another category" onPress={() => api.sendChat({ message: ANOTHER_HABIT_MESSAGE })} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: fonts.bold, fontSize: 16 },
  verdict: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  diff: { fontFamily: fonts.semibold, fontSize: 15 },
  actions: { gap: spacing.sm },
});
