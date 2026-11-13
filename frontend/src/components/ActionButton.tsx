import { StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "./Icon";
import { colors, fontSize, iconSize, radius, spacing } from "@/theme";

const CIRCLE_SIZE = 64;

type ActionButtonProps = {
  icon: IconName;
  label: string;
};

export function ActionButton({ icon, label }: ActionButtonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Icon name={icon} size={iconSize.action} color={colors.onPrimary} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: fontSize.body,
    textAlign: "center",
    color: colors.text,
  },
});
