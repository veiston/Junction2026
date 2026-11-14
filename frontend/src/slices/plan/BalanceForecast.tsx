import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { BalanceForecast as BalanceForecastData, HorizonDays } from "@/contracts";
import { colors, fontSize, radius, spacing } from "@/theme";
import { formatCents, Money } from "@/widgets/common/Money";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { BalanceChart, BILL_COLOR, type ChartEvent, INCOME_COLOR, shortDate } from "./BalanceChart";
import { useRefetch } from "./useRefetch";

const HORIZON_OPTIONS: HorizonDays[] = [30, 60, 90];
const MIN_TOUCH_SIZE = 44;
const DOT_SIZE = 8;

interface Driver {
  date: string;
  label: string;
  /** Signed: negative for a bill, positive for income. */
  cents: number;
}

/** Bills and income in date order: the reasons the line steps down or up. */
function toDrivers(data: BalanceForecastData): Driver[] {
  const bills = data.upcoming_bills.map((b) => ({ date: b.due_date, label: b.label, cents: -b.amount_cents }));
  const income = data.expected_income.map((i) => ({ date: i.date, label: i.label, cents: i.amount_cents }));
  return [...bills, ...income].sort((a, b) => a.date.localeCompare(b.date));
}

function toEvents(drivers: Driver[]): ChartEvent[] {
  return drivers.map((d) => {
    if (d.cents < 0) {
      return { date: d.date, kind: "bill" };
    }
    return { date: d.date, kind: "income" };
  });
}

function BalanceDrivers({ data, drivers }: { data: BalanceForecastData; drivers: Driver[] }) {
  const dailyCents = data.essentials_daily_cents + data.everyday_daily_cents + data.irregular_daily_cents;
  return (
    <View style={styles.drivers} accessibilityLabel="What moves your balance">
      <Text style={styles.driversTitle}>What moves your balance</Text>
      {drivers.map((d) => {
        let dotColor = BILL_COLOR;
        if (d.cents > 0) {
          dotColor = INCOME_COLOR;
        }
        return (
          <View key={`${d.date}-${d.label}`} style={styles.row}>
            <View style={styles.driverLabel}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={styles.label}>
                {shortDate(d.date)} {d.label}
              </Text>
            </View>
            <Money cents={d.cents} signed />
          </View>
        );
      })}
      <Text style={styles.note}>The steady slope is your everyday spending, about {formatCents(dailyCents)} a day.</Text>
    </View>
  );
}

export function BalanceForecast({ widget, api }: WidgetProps<BalanceForecastData>) {
  const { data, loading, error, refetch } = useRefetch(widget.data);
  const drivers = toDrivers(data);

  const selectHorizon = (days: HorizonDays) => {
    refetch(() => api.request<BalanceForecastData>("GET", `/plan/forecast?horizon_days=${days}`));
  };

  return (
    <WidgetCard title="Balance forecast">
      <View style={styles.options}>
        {HORIZON_OPTIONS.map((days) => {
          const isSelected = days === data.horizon_days;
          return (
            <Pressable
              key={days}
              accessibilityRole="button"
              accessibilityLabel={`Forecast ${days} days`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectHorizon(days)}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{days} days</Text>
            </Pressable>
          );
        })}
      </View>
      {loading && <Text style={styles.note}>Updating…</Text>}
      {error && <Text style={styles.note}>{error}</Text>}
      <BalanceChart
        series={[{ points: data.points, color: colors.primary }]}
        markedDate={data.lowest_balance_date}
        events={toEvents(drivers)}
        label={`Balance over the next ${data.horizon_days} days`}
      />
      <View style={styles.row}>
        <Text style={styles.label}>Balance in {data.horizon_days} days</Text>
        <Money cents={data.end_balance_cents} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Lowest, {shortDate(data.lowest_balance_date)}</Text>
        <Money cents={data.lowest_balance_cents} />
      </View>
      <BalanceDrivers data={data} drivers={drivers} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", gap: spacing.sm },
  option: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: fontSize.small, color: colors.text },
  optionTextSelected: { color: colors.onPrimary },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: fontSize.small, color: colors.text },
  note: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  drivers: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  driversTitle: { fontSize: fontSize.small, fontWeight: "600", color: colors.text },
  driverLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: radius.round },
});
