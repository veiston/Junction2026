import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "./Icon";
import { colors, fontSize, spacing } from "@/theme";

type ListRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export function ListRow({ icon, title, subtitle, trailing }: ListRowProps) {
  return (
    <View style={styles.row}>
      <Icon name={icon} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? <Icon name="chevron-right" color={colors.text} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
