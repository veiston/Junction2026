import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, spacing } from "@/theme";

const SIDE_WIDTH = 48;

type HeaderBarProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function HeaderBar({ title, left, right }: HeaderBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{left}</View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  side: {
    width: SIDE_WIDTH,
  },
  right: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
  },
});
