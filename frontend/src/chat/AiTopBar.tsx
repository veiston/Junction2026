import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

import type { Notice } from "./useNotifications";

interface Props {
  /** Back button: from a conversation to the three functions; from the three functions to the main page. */
  onBack: () => void;
  /** Unread notices shown under the bell. */
  notices?: Notice[];
  onNotice?: (notice: Notice) => void;
}

export function AiTopBar({ onBack, notices = [], onNotice }: Props) {
  const [bell, setBell] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.plain}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.logo}>
          <Icon name="piggy-bank-outline" size={22} color={colors.onPrimary} />
        </View>
        <Text style={styles.brand} accessibilityRole="header">
          S-MONEY · COACH
        </Text>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notices.length > 0 ? `Notifications, ${notices.length} new` : "Notifications"}
          onPress={() => {
            setBell((b) => !b);
          }}
          style={styles.plain}
        >
          <Icon name="bell-outline" size={24} color={colors.text} />
          {notices.length > 0 ? <View style={styles.dot} testID="bell-dot" /> : null}
        </Pressable>
      </View>
      {bell ? (
        <View style={styles.menu} testID="bell-list">
          {notices.length === 0 ? (
            <View style={styles.item}>
              <Text style={styles.itemText}>No new notifications</Text>
            </View>
          ) : (
            notices.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => {
                  setBell(false);
                  onNotice?.(n);
                }}
                style={styles.item}
              >
                <Text style={styles.itemText}>{n.text}</Text>
              </Pressable>
            ))
          )}
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
  dot: { position: "absolute", top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: "#D64545" },
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
