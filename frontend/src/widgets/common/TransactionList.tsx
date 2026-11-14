import { Pressable, StyleSheet, Text } from "react-native";

import type { WidgetProps } from "@/chat/registry";
import type { TransactionListData } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";

import { TransactionRow } from "./TransactionRow";
import { WidgetCard } from "./WidgetCard";

export interface TransactionListProps extends WidgetProps<TransactionListData> {
  /** Called with the widget's filter when "See all" is pressed. Provided by the chat screen. */
  onSeeAll?: (data: TransactionListData) => void;
}

export function TransactionList({ widget, api, onSeeAll }: TransactionListProps) {
  const data = widget.data;
  const { title, page } = data;
  const hidden = page.total - page.items.length;
  // Without a handler (e.g. in the gallery) fall back to asking the chat.
  const seeAll = onSeeAll ?? (() => api.sendChat({ message: `Show all: ${title}` }));
  return (
    <WidgetCard title={title}>
      {page.items.length === 0 ? (
        <Text style={styles.empty}>No transactions found.</Text>
      ) : (
        page.items.map((t) => <TransactionRow key={t.id} tx={t} />)
      )}
      {hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${page.total} transactions`}
          onPress={() => seeAll(data)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>See all ({page.total})</Text>
        </Pressable>
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: fontSize.small, color: colors.textMuted },
  button: { minHeight: 44, justifyContent: "center", paddingVertical: spacing.sm },
  buttonText: { fontSize: fontSize.small, color: colors.primary, fontWeight: "600" },
});
