import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";

const BAR_HEIGHT = 8;
const FULL_PERCENT = 100;

interface Reward {
  icon: string;
  label: string;
  cents: number;
}

/** Everyday prices in Finland, cheapest first: what a yearly saving could pay for. */
const REWARDS: Reward[] = [
  { icon: "☕", label: "a month of café coffees", cents: 6000 },
  { icon: "🎬", label: "a cinema night for two", cents: 4000 * 2 },
  { icon: "🎵", label: "a festival ticket", cents: 16000 },
  { icon: "⛴️", label: "a weekend in Tallinn", cents: 35000 },
  { icon: "📱", label: "a new phone", cents: 80000 },
  { icon: "✈️", label: "a summer trip abroad", cents: 150000 },
].sort((a, b) => a.cents - b.cents);

function progressPercent(saved: number, previous: number, next: Reward): number {
  return Math.round(((saved - previous) / (next.cents - previous)) * FULL_PERCENT);
}

/** Turns a yearly saving into unlocked rewards plus progress towards the next one. */
export function RewardUnlock({ yearlySavingCents }: { yearlySavingCents: number }) {
  if (yearlySavingCents <= 0) {
    return null;
  }
  const unlocked = REWARDS.filter((r) => r.cents <= yearlySavingCents);
  const next = REWARDS.find((r) => r.cents > yearlySavingCents);
  const best = unlocked[unlocked.length - 1];
  const previousCents = best?.cents ?? 0;

  return (
    <View style={styles.box} accessibilityLabel="Rewards you unlock">
      <Text style={styles.kicker}>
        Rewards unlocked: {unlocked.length}/{REWARDS.length}
      </Text>
      {best && (
        <Text style={styles.unlocked}>
          {best.icon} You could afford {best.label} every year
        </Text>
      )}
      {next && (
        <View style={styles.next}>
          <Text style={styles.nextText}>
            Next: {next.icon} {next.label}, {formatCents(next.cents - yearlySavingCents)} to go
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPercent(yearlySavingCents, previousCents, next)}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.background },
  kicker: { fontSize: fontSize.small - 3, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  unlocked: { fontSize: fontSize.small, fontWeight: "600", color: colors.text },
  next: { gap: spacing.xs },
  nextText: { fontSize: fontSize.small - 2, color: colors.textMuted },
  track: { height: BAR_HEIGHT, borderRadius: radius.round, backgroundColor: colors.divider, overflow: "hidden" },
  fill: { height: BAR_HEIGHT, borderRadius: radius.round, backgroundColor: colors.primary },
});
