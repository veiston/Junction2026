import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { WhatIfResult } from "@/contracts";
import { colors, fontSize, radius, spacing } from "@/theme";
import { Money } from "@/widgets/common/Money";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { ADJUSTED_COLOR, BASELINE_COLOR, BalanceChart } from "./BalanceChart";
import { whatIfLesson } from "./lessons";
import { QuickLesson } from "./QuickLesson";
import { RewardUnlock } from "./RewardUnlock";
import { useRefetch } from "./useRefetch";

const MIN_CHANGE_PCT = -100;
const MAX_CHANGE_PCT = 100;
const STEP_PCT = 5;
const MIN_TOUCH_SIZE = 44;
const TRACK_WIDTH = 240;
const TRACK_HEIGHT = 8;
const THUMB_SIZE = 24;

function clampChange(pct: number): number {
  return Math.min(MAX_CHANGE_PCT, Math.max(MIN_CHANGE_PCT, pct));
}

/** Tap position on the track (0..TRACK_WIDTH) -> change_pct on the nearest step. */
function changeAtPosition(x: number): number {
  const ratio = x / TRACK_WIDTH;
  const pct = MIN_CHANGE_PCT + ratio * (MAX_CHANGE_PCT - MIN_CHANGE_PCT);
  return clampChange(Math.round(pct / STEP_PCT) * STEP_PCT);
}

function thumbPosition(pct: number): number {
  const ratio = (pct - MIN_CHANGE_PCT) / (MAX_CHANGE_PCT - MIN_CHANGE_PCT);
  return ratio * (TRACK_WIDTH - THUMB_SIZE);
}

function formatChange(pct: number): string {
  if (pct > 0) {
    return `+${pct} %`;
  }
  return `${pct} %`;
}

function formatMonths(months: number | null): string {
  if (months === null) {
    return "Not at the current pace";
  }
  return `${months} months`;
}

function ChangeSlider({ value, onChange }: { value: number; onChange: (pct: number) => void }) {
  return (
    <View style={styles.slider}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease change by ${STEP_PCT} %`}
        onPress={() => onChange(clampChange(value - STEP_PCT))}
        style={styles.stepButton}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Change in spending"
        accessibilityValue={{ min: MIN_CHANGE_PCT, max: MAX_CHANGE_PCT, now: value }}
        onPress={(event) => onChange(changeAtPosition(event.nativeEvent.locationX))}
        style={styles.trackArea}
      >
        <View style={styles.track} />
        <View pointerEvents="none" style={[styles.thumb, { left: thumbPosition(value) }]} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase change by ${STEP_PCT} %`}
        onPress={() => onChange(clampChange(value + STEP_PCT))}
        style={styles.stepButton}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

export function WhatIf({ widget, api }: WidgetProps<WhatIfResult>) {
  const { data, loading, error, refetch } = useRefetch(widget.data);
  const [first, ...others] = data.request.adjustments;

  if (!first) {
    return (
      <WidgetCard title="What if">
        <Text style={styles.note}>Nothing to adjust yet.</Text>
      </WidgetCard>
    );
  }

  const changeTo = (pct: number) => {
    if (pct === first.change_pct) {
      return;
    }
    const request = { ...data.request, adjustments: [{ ...first, change_pct: pct }, ...others] };
    refetch(() => api.request<WhatIfResult>("POST", "/plan/what-if", request));
  };

  return (
    <WidgetCard title="What if">
      <Text style={styles.change}>{formatChange(first.change_pct)}</Text>
      <ChangeSlider value={first.change_pct} onChange={changeTo} />
      {loading && <Text style={styles.note}>Updating…</Text>}
      {error && <Text style={styles.note}>{error}</Text>}
      {data.lines.map((line) => (
        <View key={line.target} style={styles.row}>
          <Text style={styles.label}>{line.label} per month</Text>
          <Text style={styles.label}>
            {api.formatCents(line.baseline_monthly_cents)} → {api.formatCents(line.adjusted_monthly_cents)}
          </Text>
        </View>
      ))}
      <View style={styles.row}>
        <Text style={styles.label}>Saving per month</Text>
        <Money cents={data.monthly_saving_cents} signed />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Saving per year</Text>
        <Money cents={data.yearly_saving_cents} signed />
      </View>
      <RewardUnlock yearlySavingCents={data.yearly_saving_cents} />
      <BalanceChart
        series={[
          { points: data.baseline_points, color: BASELINE_COLOR },
          { points: data.adjusted_points, color: ADJUSTED_COLOR },
        ]}
        label="Balance forecast with and without the change"
      />
      <View style={styles.row}>
        <Text style={styles.note}>Without the change</Text>
        <Money cents={data.baseline_end_balance_cents} />
      </View>
      <View style={styles.row}>
        <Text style={styles.note}>With the change</Text>
        <Money cents={data.adjusted_end_balance_cents} />
      </View>
      {data.goal && (
        <View style={styles.goal}>
          <Text style={styles.label}>Months to reach your goal</Text>
          <Text style={styles.note}>Without the change: {formatMonths(data.goal.months_to_goal_baseline)}</Text>
          <Text style={styles.note}>With the change: {formatMonths(data.goal.months_to_goal_adjusted)}</Text>
        </View>
      )}
      <QuickLesson lesson={whatIfLesson(data)} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  change: { fontSize: fontSize.heading, fontWeight: "700", color: colors.text },
  slider: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  stepText: { fontSize: fontSize.title, color: colors.primary },
  trackArea: { width: TRACK_WIDTH, minHeight: MIN_TOUCH_SIZE, justifyContent: "center" },
  track: { height: TRACK_HEIGHT, borderRadius: radius.round, backgroundColor: colors.placeholder },
  thumb: {
    position: "absolute",
    top: "50%",
    marginTop: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  label: { fontSize: fontSize.small, color: colors.text },
  note: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  goal: { gap: spacing.xs },
});
