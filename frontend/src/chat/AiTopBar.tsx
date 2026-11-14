import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

interface Props {
  /** Back button: leave the coach and go to the app's main page. */
  onBack: () => void;
  /** Menu item: back to the first view with the three functions. */
  onShowFunctions: () => void;
}

export function AiTopBar({ onBack, onShowFunctions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to main page" onPress={onBack} style={styles.plain}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.logo}>
          <Icon name="piggy-bank-outline" size={22} color={colors.onPrimary} />
        </View>
        <Text style={styles.brand} accessibilityRole="header">
          S-MONEY · COACH
        </Text>
        <View style={styles.spacer} />
        <View style={styles.plain} accessibilityLabel="Notifications">
          <Icon name="bell-outline" size={24} color={colors.text} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menu"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={styles.menuButton}
        >
          <Icon name="menu" size={22} color={colors.text} />
        </Pressable>
      </View>
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
  wrap: { zIndex: 10, position: "relative", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: coachColors.border },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  plain: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 12, letterSpacing: 0.8, fontFamily: fonts.bold, color: colors.primary },
  spacer: { flex: 1 },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: coachColors.surfaceMuted,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  menu: {
    position: "absolute",
    top: "100%",
    right: spacing.md,
    minWidth: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: coachColors.border,
    paddingVertical: spacing.xs,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  itemText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
});
