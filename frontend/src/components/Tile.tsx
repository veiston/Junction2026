import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";
import { colors, fontSize, iconSize, spacing } from "@/theme";

type TileProps = {
  icon: IconName;
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function Tile({ icon, label, style }: TileProps) {
  return (
    <Card style={style}>
      <View style={styles.content}>
        <Icon name={icon} size={iconSize.tile} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  label: {
    fontSize: fontSize.body,
    color: colors.text,
  },
});
