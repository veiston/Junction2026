import { Pressable, StyleSheet, Text, View } from "react-native";

import { SvgSpeakerIcon } from "@/components/SvgSpeakerIcon";
import type { TransactionListData, WidgetType } from "@/contracts";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";
import { SourceLine } from "@/widgets/common/SourceLine";

import { AVATAR_SIZE, CoachAvatar } from "./CoachAvatar";
import { MarkdownText } from "./MarkdownText";
import type { ChatMessage } from "./useChat";
import { WidgetHost } from "./WidgetHost";
import type { WidgetHostApi } from "./registry";

interface Props {
  messages: ChatMessage[];
  api: WidgetHostApi;
  /** Tapping a follow-up suggestion sends it as a message. */
  onSend: (text: string) => void;
  onSeeAll: (data: TransactionListData) => void;
  /** Read one assistant message aloud (tapping again stops it). */
  onPlayTts: (messageId: string, text: string) => void;
  playingMessageId: string | null;
  /** Reports where each message starts, so the screen can scroll to it. */
  onMessageLayout?: (id: string, y: number) => void;
}

const SPEAK_BUTTON_SIZE = 28;

/** Cards that already print their own source line; the message does not repeat it under them. */
const CARDS_WITH_OWN_SOURCE = new Set<WidgetType>([
  "basket_breakdown",
  "basket_trend",
  "spending_summary",
  "spender_profile",
  "peer_benchmark",
]);

/** Messaging-app look: the customer's bubbles on the right, the coach's on the left with its cards below. */
export function MessageList({ messages, api, onSend, onSeeAll, onPlayTts, playingMessageId, onMessageLayout }: Props) {
  return (
    <View style={styles.list} accessibilityLabel="Conversation">
      {messages.map((m) =>
        m.role === "user" ? (
          <View
            key={m.id}
            style={styles.user}
            testID="bubble-user"
            onLayout={(e) => onMessageLayout?.(m.id, e.nativeEvent.layout.y)}
          >
            <Text style={styles.userText}>{m.text}</Text>
          </View>
        ) : (
          <View key={m.id} style={styles.assistant} onLayout={(e) => onMessageLayout?.(m.id, e.nativeEvent.layout.y)}>
            {m.text ? (
              <View style={styles.row}>
                <CoachAvatar />
                <View style={styles.bubble} testID="bubble-coach">
                  <MarkdownText content={m.text} style={styles.text} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={playingMessageId === m.id ? "Stop reading" : "Read aloud"}
                    onPress={() => onPlayTts(m.id, m.text)}
                    style={styles.speak}
                  >
                    <SvgSpeakerIcon color={colors.primary} playing={playingMessageId === m.id} />
                  </Pressable>
                </View>
              </View>
            ) : null}
            {m.widgets.map((w) => (
              <View key={w.id} style={styles.card}>
                <WidgetHost widget={w} api={api} onSeeAll={onSeeAll as never} />
              </View>
            ))}
            {m.widgets.every((w) => CARDS_WITH_OWN_SOURCE.has(w.type))
              ? null
              : m.sources.map((s, i) => (
                  <View key={i} style={styles.inset}>
                    <SourceLine source={s} />
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
    gap: spacing.xs,
    backgroundColor: coachColors.surfaceMuted,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: colors.text },
  speak: {
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    width: SPEAK_BUTTON_SIZE,
    height: SPEAK_BUTTON_SIZE,
    borderRadius: radius.round,
    backgroundColor: coachColors.sendButton,
  },
  card: { marginLeft: INSET },
  inset: { marginLeft: INSET },
  disclaimer: { fontSize: 12, color: colors.textSubtle },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, color: colors.primary },
});
