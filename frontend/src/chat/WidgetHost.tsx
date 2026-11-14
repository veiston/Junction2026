import { StyleSheet, Text } from "react-native";

import type { Widget } from "@/contracts";
import { colors, fontSize } from "@/theme";
import { TransactionList } from "@/widgets/common/TransactionList";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { registry, type WidgetHostApi } from "./registry";

interface Props {
  widget: Widget;
  api: WidgetHostApi;
  /** Chat-screen override for the transaction_list "See all" button. */
  onSeeAll?: (data: Widget["data"]) => void;
}

export function WidgetHost({ widget, api, onSeeAll }: Props) {
  const Component = registry[widget.type];
  if (!Component) {
    return (
      <WidgetCard>
        <Text style={styles.fallback} testID="widget-fallback">
          This view is coming soon.
        </Text>
      </WidgetCard>
    );
  }
  if (Component === TransactionList) {
    return <TransactionList widget={widget as never} api={api} onSeeAll={onSeeAll as never} />;
  }
  return <Component widget={widget as never} api={api} />;
}

const styles = StyleSheet.create({
  fallback: { fontSize: fontSize.small, color: colors.textMuted },
});
