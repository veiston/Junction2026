import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Widget } from "@/contracts";
import { colors, fonts, fontSize } from "@/theme";
import { TransactionList } from "@/widgets/common/TransactionList";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { registry, type WidgetHostApi } from "./registry";

interface Props {
  widget: Widget;
  api: WidgetHostApi;
  /** Chat-screen override for the transaction_list "See all" button. */
  onSeeAll?: (data: Widget["data"]) => void;
}

/** The concept id a widget carries, if any (card level or first suggestion). */
function conceptIdOf(data: unknown): string | null {
  const d = data as { concept?: { id?: string } | null; items?: { concept?: { id?: string } | null }[] } | null | undefined;
  const direct = d?.concept?.id;
  if (typeof direct === "string") return direct;
  const first = Array.isArray(d?.items) ? d?.items?.find((i) => i?.concept?.id)?.concept?.id : undefined;
  return typeof first === "string" ? first : null;
}

export function explainMessage(widget: Widget): string {
  const concept = conceptIdOf(widget.data);
  return concept ? `Explain the concept: ${concept}` : `Explain this: ${widget.type}`;
}

function ExplainButton({ widget, api }: { widget: Widget; api: WidgetHostApi }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Explain this card"
      onPress={() => api.sendChat({ message: explainMessage(widget) })}
      style={styles.explain}
      testID="explain-button"
    >
      <Text style={styles.explainText}>Explain</Text>
    </Pressable>
  );
}

function Rendered({ widget, api, onSeeAll }: Props) {
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

export function WidgetHost(props: Props) {
  const { widget, api } = props;
  return (
    <View style={styles.wrap}>
      <Rendered {...props} />
      {widget.type === "concept_note" ? null : <ExplainButton widget={widget} api={api} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  explain: { minHeight: 44, minWidth: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 8 },
  explainText: { fontFamily: fonts.semibold, fontSize: fontSize.small, color: colors.primary },
  fallback: { fontSize: fontSize.small, color: colors.textMuted },
});
