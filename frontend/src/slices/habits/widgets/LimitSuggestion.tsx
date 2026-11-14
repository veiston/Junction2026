import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { LimitSuggestion as LimitSuggestionData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { colors, fonts, spacing } from "@/theme";

import { useAcceptLimit } from "../hooks/useAcceptLimit";
import { AmountSlider } from "./AmountSlider";
import { monthLabel } from "./format";
import { Body, Card, ErrorText, PrimaryButton, Title } from "./ui";

export function LimitSuggestion({ widget, api }: WidgetProps<LimitSuggestionData>) {
  const d = widget.data;
  const [value, setValue] = useState(d?.suggested_cents ?? 0);
  const { accept, loading, result, alreadySet, errorMessage } = useAcceptLimit(api);

  if (!d) return null;
  const fmt = api.formatCents;

  if (result) {
    return (
      <Card label="Limit confirmed">
        <Title>Limit set</Title>
        <Text style={styles.amount} testID="limit-confirmed">
          {fmt(result.amount_cents)}
        </Text>
        <Body muted>{`Your everyday spending limit for ${monthLabel(result.month)}.`}</Body>
      </Card>
    );
  }

  return (
    <Card label="Suggested monthly limit">
      <Title>{`Suggested limit for ${monthLabel(d.month)}`}</Title>
      <Text style={styles.amount} testID="limit-amount" accessibilityLiveRegion="polite">
        {fmt(value)}
      </Text>
      <AmountSlider
        value={value}
        min={d.min_cents}
        max={d.max_cents}
        step={d.step_cents}
        onChange={setValue}
        label="Monthly limit"
        format={fmt}
      />
      {d.rationale ? <Body muted>{d.rationale}</Body> : null}
      {d.expected_saving_cents > 0 ? (
        <Body muted>{`Expected saving: ${fmt(d.expected_saving_cents)} compared with your recent average.`}</Body>
      ) : null}
      {d.history?.length ? (
        <View style={styles.history}>
          {d.history.map((h) => (
            <Text key={h.month} style={styles.historyItem}>
              {`${monthLabel(h.month)}: ${fmt(h.amount_cents)}`}
            </Text>
          ))}
        </View>
      ) : null}
      {alreadySet ? <ErrorText>You already set a limit for this month.</ErrorText> : null}
      {errorMessage && !alreadySet ? <ErrorText>{errorMessage}</ErrorText> : null}
      <PrimaryButton
        label={loading ? "Saving..." : "Accept"}
        accessibilityLabel="Accept"
        disabled={loading || alreadySet}
        onPress={() => accept({ month: d.month, amount_cents: value })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  amount: { fontFamily: fonts.bold, fontSize: 32, color: colors.primary },
  history: { gap: 2, marginBottom: spacing.xs },
  historyItem: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
