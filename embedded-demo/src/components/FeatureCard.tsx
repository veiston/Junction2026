import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";
import { colors, fontSize, iconSize, spacing } from "@/theme";

type FeatureCardProps = {
  icon: IconName;
  title: string;
  description: string;
  amount?: string;
};

export function FeatureCard({ icon, title, description, amount }: FeatureCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <Icon name={icon} size={iconSize.feature} />
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {amount !== undefined && <Text style={styles.amount}>{amount}</Text>}
        </View>
        <Icon name="chevron-right" color={colors.text} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.feature,
    fontWeight: "800",
    color: colors.primary,
  },
  description: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  amount: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
