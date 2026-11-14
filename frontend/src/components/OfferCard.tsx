import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { Icon } from "./Icon";
import { colors, fontSize, iconSize, radius, spacing } from "@/theme";

const CARD_WIDTH = 260;
const IMAGE_HEIGHT = 180;

type OfferCardProps = {
  title: string;
  description: string;
};

export function OfferCard({ title, description }: OfferCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.image}>
        <Icon name="tag-outline" size={iconSize.feature} />
      </View>
      <View style={styles.bookmark}>
        <Icon name="bookmark-outline" color={colors.text} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  image: {
    height: IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.placeholder,
  },
  bookmark: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  body: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
});
