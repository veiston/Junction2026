import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

import type { Notice } from "./useNotifications";

/** Icon and colours per tone; the title always says it in words too, so colour is never the only cue. */
const TONE: Record<Notice["tone"], { icon: IconName; color: string; background: string }> = {
  warning: { icon: "trending-up", color: "#B54708", background: "#FEF0C7" },
  good: { icon: "thumb-up-outline", color: colors.primary, background: "#DDF0E2" },
  info: { icon: "lightbulb-on-outline", color: colors.primary, background: "#EAF4EC" },
};

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
                accessibilityLabel={`${n.title}. ${n.text}`}
                onPress={() => {
                  setBell(false);
                  onNotice?.(n);
                }}
                style={[styles.item, styles.notice]}
              >
                <View style={[styles.toneIcon, { backgroundColor: TONE[n.tone].background }]}>
                  <Icon name={TONE[n.tone].icon} size={18} color={TONE[n.tone].color} />
                </View>
                <View style={styles.noticeBody}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  <Text style={styles.noticeText}>{n.text}</Text>
                </View>
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
    maxWidth: 340,
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
  notice: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  toneIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  noticeBody: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  noticeText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
});
