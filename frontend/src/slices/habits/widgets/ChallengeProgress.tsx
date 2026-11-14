import { StyleSheet, Text } from "react-native";

import type { ChallengeProgress as ChallengeProgressData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { colors, fonts } from "@/theme";

import { plural } from "./format";
import { ruleText } from "./ruleText";
import { Body, Card, ProgressBar, Title, danger } from "./ui";

const STATUS: Record<string, { text: string; color: string }> = {
  active: { text: "Active", color: colors.primary },
  won: { text: "Won", color: colors.primary },
  lost: { text: "Lost", color: danger },
  cancelled: { text: "Cancelled", color: colors.textMuted },
};

export function ChallengeProgress({ widget, api }: WidgetProps<ChallengeProgressData>) {
  const d = widget.data;
  if (!d?.challenge) return null;
  const c = d.challenge;
  const status = STATUS[c.status] ?? STATUS.active;
  const barColor = c.status === "lost" || (c.status === "active" && !d.on_track) ? danger : colors.primary;
  return (
    <Card label="Challenge progress">
      <Title>{c.title}</Title>
      <Text style={[styles.status, { color: status.color }]} testID="challenge-status">
        {status.text}
      </Text>
      <Body muted>{ruleText(c.rule, api.formatCents)}</Body>
      <ProgressBar fraction={(d.progress_pct ?? 0) / 100} color={barColor} label="Challenge progress" />
      <Body muted>
        {c.status === "active"
          ? `${Math.round(d.progress_pct)}% done, ${plural(d.days_left, "day", "days")} left${
              d.on_track ? ", on track" : ", at risk"
            }.`
          : `${c.start_date} to ${c.end_date}`}
      </Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: fonts.bold, fontSize: 16 },
});
