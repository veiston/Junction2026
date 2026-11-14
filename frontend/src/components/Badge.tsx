import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius } from "@/theme";

const BADGE_SIZE = 28;

export function Badge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.onPrimary,
  },
});
