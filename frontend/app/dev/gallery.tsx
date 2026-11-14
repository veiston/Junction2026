import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { WidgetHost } from "@/chat/WidgetHost";
import { registry, type WidgetHostApi } from "@/chat/registry";
import type { Widget, WidgetType } from "@/contracts";
import { mocks } from "@/dev/mocks";
import { colors, fontSize, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";

const host: WidgetHostApi = {
  request: api.request,
  sendChat: () => {},
  formatCents,
};

/** Dev only: renders every registered widget type from its mock. */
export default function WidgetGallery() {
  const types = Object.keys(registry) as WidgetType[];
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Widget gallery</Text>
        {types.map((type) => {
          const data = mocks[type];
          return (
            <View key={type} style={styles.item}>
              <Text style={styles.type}>{type}</Text>
              {data === undefined ? (
                <Text style={styles.missing}>No mock yet.</Text>
              ) : (
                <WidgetHost widget={{ id: `mock_${type}`, version: 1, type, data } as Widget} api={host} />
              )}
            </View>
          );
        })}
        <View style={styles.item}>
          <Text style={styles.type}>unknown type (fallback)</Text>
          <WidgetHost
            widget={{ id: "mock_unknown", version: 1, type: "limit_review", data: {} } as Widget}
            api={host}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
  title: { fontSize: fontSize.heading, fontWeight: "700", color: colors.text },
  item: { gap: spacing.sm },
  type: { fontSize: fontSize.small - 2, color: colors.textMuted },
  missing: { fontSize: fontSize.small, color: colors.textMuted },
});
