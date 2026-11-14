import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TransactionListData } from "@/contracts";
import { SvgSpeakerIcon } from "@/components/SvgSpeakerIcon";
import { coachColors, colors, fontSize, radius, spacing } from "@/theme";
import { SourceLine } from "@/widgets/common/SourceLine";

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
}

const SPEAK_BUTTON_SIZE = 28;

export function MessageList({ messages, api, onSend, onSeeAll, onPlayTts, playingMessageId }: Props) {
  return (
    <View style={styles.list} accessibilityLabel="Conversation">
      {messages.map((m) =>
        m.role === "user" ? (
          <View key={m.id} style={styles.user}>
            <Text style={styles.userText}>{m.text}</Text>
          </View>
        ) : (
          <View key={m.id} style={styles.assistant}>
            {m.text ? (
              <View style={styles.bubble}>
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
            ) : null}
            {m.widgets.map((w) => (
              <WidgetHost key={w.id} widget={w} api={api} onSeeAll={onSeeAll as never} />
            ))}
            {m.sources.map((s, i) => (
              <SourceLine key={i} source={s} />
            ))}
            {m.disclaimer ? <Text style={styles.disclaimer}>{m.disclaimer}</Text> : null}
            {m.suggestions.length > 0 && (
              <View style={styles.suggestions}>
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

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  user: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: colors.brand,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: { fontSize: fontSize.small, color: colors.onPrimary },
  assistant: { alignSelf: "stretch", gap: spacing.sm },
  bubble: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: colors.surface,
  },
  text: { fontSize: fontSize.small, color: colors.text },
  speak: {
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    width: SPEAK_BUTTON_SIZE,
    height: SPEAK_BUTTON_SIZE,
    borderRadius: radius.round,
    backgroundColor: coachColors.sendButton,
  },
  disclaimer: { fontSize: fontSize.small - 3, color: colors.textSubtle },
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
  chipText: { fontSize: fontSize.small, color: colors.primary },
});
