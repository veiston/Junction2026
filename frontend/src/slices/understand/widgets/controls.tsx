import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { TransactionPage } from "@/contracts";
import { colors, radius, spacing } from "@/theme";
import { TransactionRow } from "@/widgets/common/TransactionRow";

import { monthLabel } from "../format";
import { u } from "./styles";

function Button({ label, onPress, disabled, a11y }: { label: string; onPress: () => void; disabled?: boolean; a11y: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={u.linkText}>{label}</Text>
    </Pressable>
  );
}

export function Status({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) {
    return (
      <Text accessibilityRole="alert" style={styles.error}>
        {error}
      </Text>
    );
  }
  return loading ? <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} /> : null;
}

interface MonthSwitcherProps {
  month: string;
  canPrev: boolean;
  canNext: boolean;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthSwitcher({ month, canPrev, canNext, loading, onPrev, onNext }: MonthSwitcherProps) {
  return (
    <View style={u.row}>
      <Button label="‹ Previous" a11y="Previous month" disabled={!canPrev || loading} onPress={onPrev} />
      <Text style={u.strong}>{monthLabel(month)}</Text>
      <Button label="Next ›" a11y="Next month" disabled={!canNext || loading} onPress={onNext} />
    </View>
  );
}

export function RangeSelector({
  options,
  value,
  loading,
  onChange,
}: {
  options: readonly number[];
  value: number;
  loading: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.segments} accessibilityRole="tablist">
      {options.map((n) => {
        const active = n === value;
        return (
          <Pressable
            key={n}
            accessibilityRole="tab"
            accessibilityLabel={`${n} months`}
            accessibilityState={{ selected: active, disabled: loading }}
            disabled={loading || active}
            onPress={() => onChange(n)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[u.muted, active && styles.segmentTextActive]}>{n} mo</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SeeAllProps {
  total: number;
  /** Rows already visible in the widget; the button only appears when more exist. */
  shown: number;
  open: boolean;
  onToggle: () => void;
  data: TransactionPage | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageCount: number;
  setPage: (n: number) => void;
}

/** "See all" for spending_summary: expands the full, paged list inside the widget. */
export function SeeAll({ total, shown, open, onToggle, data, loading, error, page, pageCount, setPage }: SeeAllProps) {
  if (total <= shown) return null;
  return (
    <View>
      <Button label={open ? "Hide the list" : `See all (${total})`} a11y={open ? "Hide the list" : `See all ${total} transactions`} onPress={onToggle} />
      {open && (
        <View testID="see-all-list">
          <Status loading={loading} error={error} />
          {data?.items.map((t) => <TransactionRow key={t.id} tx={t} />)}
          {data && pageCount > 1 && (
            <View style={u.row}>
              <Button label="‹ Previous" a11y="Previous page" disabled={loading || page <= 1} onPress={() => setPage(page - 1)} />
              <Text style={u.muted}>
                Page {page} of {pageCount}
              </Text>
              <Button label="Next ›" a11y="Next page" disabled={loading || page >= pageCount} onPress={() => setPage(page + 1)} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
  disabled: { opacity: 0.35 },
  error: { color: "#B3261E" },
  segments: { flexDirection: "row", gap: spacing.xs, alignSelf: "flex-start" },
  segment: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentTextActive: { color: colors.onPrimary, fontWeight: "600" },
});
