import { StyleSheet, Text, View } from "react-native";

import type { SpenderProfile } from "@/contracts";
import { colors, radius, spacing } from "@/theme";
import { SourceLine } from "@/widgets/common/SourceLine";
import { WidgetCard } from "@/widgets/common/WidgetCard";

import { u } from "./styles";

export function SpenderProfileView({ data }: { data: SpenderProfile }) {
  return (
    <WidgetCard title="Your spender profile">
      <View style={styles.persona}>
        <Text style={u.big}>{data.title}</Text>
        <Text style={u.body}>{data.description}</Text>
      </View>
      {data.traits.map((t) => (
        <View key={t.key} style={styles.trait}>
          <Text style={u.strong}>{t.label}</Text>
          <Text style={u.body}>{t.value_text}</Text>
          <Text style={u.subtle}>{t.evidence}</Text>
        </View>
      ))}
      {data.tips.length > 0 && (
        <View style={styles.tips}>
          <Text style={u.strong}>Ideas to try</Text>
          {data.tips.map((tip) => (
            <Text key={tip} style={u.body}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
      <SourceLine source={data.source} />
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  persona: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: colors.background },
  trait: { gap: 2, paddingVertical: spacing.xs },
  tips: { gap: spacing.xs },
});
