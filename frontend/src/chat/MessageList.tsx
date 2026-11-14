import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TransactionListData } from "@/contracts";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

import { AVATAR_SIZE, CoachAvatar } from "./CoachAvatar";
import { RichText } from "./RichText";
import type { ChatMessage } from "./useChat";
import { WidgetHost } from "./WidgetHost";
import type { WidgetHostApi } from "./registry";

interface Props {
  messages: ChatMessage[];
  api: WidgetHostApi;
  /** Tapping a follow-up suggestion sends it as a message. */
  onSend: (text: string) => void;
  onSeeAll: (data: TransactionListData) => void;
}

/** Messaging-app look: the customer's bubbles on the right, the coach's on the left with its cards below. */
export function MessageList({ messages, api, onSend, onSeeAll }: Props) {
  return (
    <View style={styles.list} accessibilityLabel="Conversation">
      {messages.map((m) =>
        m.role === "user" ? (
          <View key={m.id} style={styles.user} testID="bubble-user">
            <Text style={styles.userText}>{m.text}</Text>
          </View>
        ) : (
          <View key={m.id} style={styles.assistant}>
            {m.text ? (
              <View style={styles.row}>
                <CoachAvatar />
                <View style={styles.bubble} testID="bubble-coach">
                  <RichText text={m.text} style={styles.text} />
                </View>
              </View>
            ) : null}
            {m.widgets.map((w) => (
              <View key={w.id} style={styles.card}>
                <WidgetHost widget={w} api={api} onSeeAll={onSeeAll as never} />
              </View>
            ))}
            {m.disclaimer ? <Text style={[styles.disclaimer, styles.inset]}>{m.disclaimer}</Text> : null}
            {m.suggestions.length > 0 && (
              <View style={[styles.suggestions, styles.inset]}>
                {m.suggestions.map((s) => (
                  <Pressable key={s} accessibilityRole="button" onPress={() => onSend(s)} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ),
      )}
    </View>
  );
}

const INSET = AVATAR_SIZE + spacing.sm;

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  user: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: colors.onPrimary },
  assistant: { alignSelf: "stretch", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  bubble: {
    flexShrink: 1,
    maxWidth: "85%",
    backgroundColor: coachColors.surfaceMuted,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: colors.text },
  card: { marginLeft: INSET },
  inset: { marginLeft: INSET },
  disclaimer: { fontSize: 12, color: colors.textSubtle },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, color: colors.primary },
});
