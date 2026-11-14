import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TransactionFilter } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";
import { Money } from "@/widgets/common/Money";
import { TransactionRow } from "@/widgets/common/TransactionRow";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { useTransactions } from "./useTransactions";

interface Props {
  title: string;
  filter: TransactionFilter;
  onClose: () => void;
}

export function SeeAllPanel({ title, filter, onClose }: Props) {
  const { data, page, pageCount, loading, error, setPage } = useTransactions(filter);
  return (
    <WidgetCard title={title}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.link}>
        <Text style={styles.linkText}>Back to chat</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {data && (
        <>
          <Text testID="see-all-totals" style={styles.totals}>
            {data.total} transactions · total
          </Text>
          <Money cents={data.total_amount_cents} signed />
          {data.items.map((t) => (
            <TransactionRow key={t.id} tx={t} />
          ))}
          <View style={styles.pager}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous page"
              disabled={loading || page <= 1}
              onPress={() => setPage(page - 1)}
              style={[styles.link, (loading || page <= 1) && styles.disabled]}
            >
              <Text style={styles.linkText}>Previous</Text>
            </Pressable>
            <Text style={styles.totals}>
              Page {page} of {pageCount}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next page"
              disabled={loading || page >= pageCount}
              onPress={() => setPage(page + 1)}
              style={[styles.link, (loading || page >= pageCount) && styles.disabled]}
            >
              <Text style={styles.linkText}>Next</Text>
            </Pressable>
          </View>
        </>
      )}
      {!data && loading ? <Text style={styles.totals}>Loading…</Text> : null}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: "center", paddingVertical: spacing.sm },
  linkText: { fontSize: fontSize.small, color: colors.primary, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  totals: { fontSize: fontSize.small - 1, color: colors.textMuted },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
