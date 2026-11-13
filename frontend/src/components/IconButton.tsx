import { StyleSheet, View } from "react-native";

import { Icon, type IconName } from "./Icon";
import { colors, radius, spacing } from "@/theme";

const DOT_SIZE = 8;

type IconButtonProps = {
  icon: IconName;
  showDot?: boolean;
};

export function IconButton({ icon, showDot = false }: IconButtonProps) {
  return (
    <View style={styles.button}>
      <Icon name={icon} color={colors.text} />
      {showDot && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.round,
    backgroundColor: colors.text,
  },
});
