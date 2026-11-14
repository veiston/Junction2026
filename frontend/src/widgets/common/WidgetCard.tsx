import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/theme";

export function WidgetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card} accessibilityLabel={title}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  title: { fontSize: fontSize.body, fontWeight: "600", color: colors.text },
});
