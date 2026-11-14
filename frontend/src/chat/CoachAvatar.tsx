import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors } from "@/theme";

/** Small round coach avatar shown next to the coach's bubbles. */
export function CoachAvatar() {
  return (
    <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name="piggy-bank-outline" size={16} color={colors.onPrimary} />
    </View>
  );
}

export const AVATAR_SIZE = 28;

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
