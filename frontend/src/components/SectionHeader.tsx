import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, spacing } from "@/theme";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
};

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel !== undefined && <Text style={styles.action}>{actionLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.primary,
  },
  action: {
    fontSize: fontSize.body,
    color: colors.primary,
  },
});
