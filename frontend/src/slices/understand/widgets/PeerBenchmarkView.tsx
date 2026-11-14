import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import type { PeerBenchmark } from "@/contracts";
import { colors, radius, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";
import { SourceLine } from "@/widgets/common/SourceLine";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { basketColor, pct } from "../format";
import { u } from "./styles";

/** Position 0..100 % of a value on a scale from 0 to `top`. */
const at = (value: number, top: number) => `${Math.min(100, Math.max(0, (value / top) * 100))}%` as const;

export function PeerBenchmarkView({ data }: { data: PeerBenchmark }) {
  const top = Math.max(1, data.your_monthly_cents, data.peer_p75_monthly_cents) * 1.15;
  const { peer_group: g, open_data: ref } = data;
  const percentileText =
    g.size === 0
      ? "There are no similar customers to compare with yet."
      : `You spend more than ${data.your_percentile} % of similar customers.`;

  return (
    <WidgetCard title={`${data.label} · you vs similar customers`}>
      <View style={u.row}>
        <View>
          <Text style={u.muted}>You, per month</Text>
          <Text style={u.big} testID="peer-you">
            {formatCents(data.your_monthly_cents)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={u.muted}>Typical (median)</Text>
          <Text style={u.big}>{formatCents(data.peer_median_monthly_cents)}</Text>
        </View>
      </View>

      <View style={styles.track} accessibilityLabel="Your monthly spending on the peer range">
        <View
          style={[
            styles.range,
            { left: at(data.peer_p25_monthly_cents, top), right: `${100 - Math.min(100, (data.peer_p75_monthly_cents / top) * 100)}%` },
          ]}
        />
        <View style={[styles.median, { left: at(data.peer_median_monthly_cents, top) }]} />
        <View style={[styles.you, { left: at(data.your_monthly_cents, top) }]} />
      </View>
      <Text style={u.subtle}>
        Middle half of similar customers: {formatCents(data.peer_p25_monthly_cents)} – {formatCents(data.peer_p75_monthly_cents)}
      </Text>

      <Text style={u.body}>{percentileText}</Text>
      <Text style={u.muted}>
        {data.label} is {pct(data.your_share_of_spending_pct)} of your spending.
      </Text>
      <Text style={u.subtle}>
        Compared with: age {g.age_band} · {g.region} · {g.size} customers
      </Text>

      {ref && (
        <View style={styles.ref}>
          <Text style={u.strong}>Statistics Finland {ref.year}</Text>
          <Text style={u.body}>
            {ref.label}: {pct(ref.share_of_spending_pct)} of household spending.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(ref.source_url)} style={u.link}>
            <Text style={u.linkText}>Open the source table</Text>
          </Pressable>
        </View>
      )}
      <SourceLine source={data.source} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: "flex-end" },
  track: { height: 22, justifyContent: "center", marginVertical: spacing.xs },
  range: {
    position: "absolute",
    height: 10,
    borderRadius: radius.round,
    backgroundColor: colors.placeholder,
  },
  median: { position: "absolute", width: 2, height: 18, backgroundColor: colors.textMuted },
  you: {
    position: "absolute",
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: basketColor.mandatory_regular,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  ref: { gap: 2, padding: spacing.sm, borderRadius: radius.card, backgroundColor: colors.background },
});
