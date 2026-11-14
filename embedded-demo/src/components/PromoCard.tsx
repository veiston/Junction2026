import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { Icon } from "./Icon";
import { colors, fontSize, iconSize, radius, spacing } from "@/theme";

export function PromoCard() {
  return (
    <Card style={styles.card}>
      <View style={styles.iconBox}>
        <Icon name="credit-card-outline" size={iconSize.tile} />
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Keskitä ostoksesi</Text>
          <Icon name="close" color={colors.textMuted} />
        </View>
        <Text style={styles.body}>Kerää bonusta myös kumppaneidemme palveluista</Text>
        <View style={styles.link}>
          <Text style={styles.linkLabel}>Katso kumppanit</Text>
          <Icon name="open-in-new" size={iconSize.small} />
        </View>
        <Text style={styles.host}>example.com</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconBox: {
    alignSelf: "flex-start",
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  texts: {
    flex: 1,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  linkLabel: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.primary,
  },
  host: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
});
