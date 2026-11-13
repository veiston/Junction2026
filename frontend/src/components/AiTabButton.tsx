import { Pressable, StyleSheet, View, type PressableProps } from "react-native";

import { Icon } from "./Icon";
import { colors, iconSize, radius, spacing } from "@/theme";

const BUTTON_SIZE = 64;
const BORDER_WIDTH = 4;
const RAISED_BY = spacing.md;

// The only live control, everything else in the app is a static mockup
export function AiTabButton({ onPress }: { onPress?: PressableProps["onPress"] }) {
  return (
    <Pressable onPress={onPress} style={styles.slot}>
      <View style={styles.circle}>
        <Icon name="star-four-points" size={iconSize.action} color={colors.onPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.round,
    borderWidth: BORDER_WIDTH,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    transform: [{ translateY: -RAISED_BY }],
  },
});
