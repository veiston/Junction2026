import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HeaderBar } from "@/components/HeaderBar";
import { Icon } from "@/components/Icon";
import { colors, fontSize, radius, spacing } from "@/theme";

interface Props {
  /** Back button: leave the coach and go to the app's main page. */
  onBack: () => void;
  /** Menu item: back to the first view with the three function buttons. */
  onShowFunctions: () => void;
}

export function AiTopBar({ onBack, onShowFunctions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <HeaderBar
        title="AI"
        left={
          <Pressable accessibilityRole="button" accessibilityLabel="Back to main page" onPress={onBack} style={styles.button}>
            <Icon name="arrow-left" color={colors.text} />
          </Pressable>
        }
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menu"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            style={styles.button}
          >
            <Icon name="dots-vertical" color={colors.text} />
          </Pressable>
        }
      />
      {open ? (
        <View accessibilityRole="menu" style={styles.menu}>
          <Pressable
            accessibilityRole="menuitem"
            onPress={() => {
              setOpen(false);
              onShowFunctions();
            }}
            style={styles.item}
          >
            <Text style={styles.itemText}>Back to the three functions</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10, position: "relative" },
  button: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  menu: {
    position: "absolute",
    top: "100%",
    right: spacing.md,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.xs,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  itemText: { fontSize: fontSize.small, color: colors.text },
});
