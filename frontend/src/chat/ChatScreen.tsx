import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api as apiClient } from "@/api/client";
import type { QuickAction, TransactionListData } from "@/contracts";
import { colors, fonts, spacing } from "@/theme";
import { useVoiceConversation } from "@/voice/useVoiceConversation";
import { formatCents } from "@/widgets/common/Money";

import { Composer } from "./Composer";
import { FunctionCards } from "./FunctionCards";
import { MessageList } from "./MessageList";
import { SeeAllPanel } from "./SeeAllPanel";
import { SuggestionChips } from "./SuggestionChips";
import type { WidgetHostApi } from "./registry";
import type { UseChat } from "./useChat";

/** Chat UI: all data comes from the `chat` hook result passed in. */
export function ChatScreen({ chat }: { chat: UseChat }) {
  const { messages, busy, error, send, sendChip, retry, started } = chat;
  const [seeAll, setSeeAll] = useState<TransactionListData | null>(null);

  const voice = useVoiceConversation({
    messages,
    busy,
    onSend: send,
  });

  // Follow new messages until the customer scrolls back themselves.
  const scrollRef = useRef<ScrollView>(null);
  const followBottom = useRef(false);
  useEffect(() => {
    followBottom.current = true;
  }, [messages.length, busy]);

  const scrollToNewest = () => {
    if (!followBottom.current) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const host: WidgetHostApi = useMemo(
    () => ({
      request: apiClient.request,
      sendChat: (req) => (req.quick_action ? sendChip(req.quick_action as QuickAction) : send(req.message ?? "")),
      formatCents,
    }),
    [send, sendChip],
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToNewest}
        onScrollBeginDrag={() => {
          followBottom.current = false;
        }}
      >
        {seeAll ? (
          <SeeAllPanel title={seeAll.title} filter={seeAll.filter} onClose={() => setSeeAll(null)} />
        ) : (
          <>
            {!started ? (
              <>
                <View style={styles.intro}>
                  <Text style={styles.heading} accessibilityRole="header">
                    What would you like to do today?
                  </Text>
                  <Text style={styles.sub}>Choose an option or ask your own question.</Text>
                </View>
                <FunctionCards onPick={sendChip} disabled={busy} />
              </>
            ) : null}
            <MessageList
              messages={messages}
              api={host}
              onSend={send}
              onSeeAll={setSeeAll}
              onPlayTts={voice.playMessageTts}
              playingMessageId={voice.playingMessageId}
            />
            {busy ? (
              <Text accessibilityRole="progressbar" style={styles.status}>
                Thinking…
              </Text>
            ) : null}
            {error ? (
              <View accessibilityRole="alert" style={styles.error}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {seeAll ? null : (
        <View style={styles.footer}>
          {voice.isConversationMode && (
            <Pressable
              style={styles.voiceBanner}
              accessibilityRole="button"
              accessibilityLabel="Interrupt the coach"
              disabled={!voice.isSpeaking}
              onPress={voice.interrupt}
            >
              <View
                style={[
                  styles.voiceDot,
                  voice.isListening && styles.voiceDotListening,
                  voice.isSpeaking && styles.voiceDotSpeaking,
                ]}
              />
              <Text style={styles.voiceBannerText} numberOfLines={1}>
                {voice.voiceStatus || "Conversation mode active • Speak naturally"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop conversation mode"
                onPress={voice.toggleConversationMode}
                hitSlop={8}
                style={styles.voiceBannerCloseBtn}
              >
                <Text style={styles.voiceBannerClose}>End</Text>
              </Pressable>
            </Pressable>
          )}
          {!started ? <SuggestionChips onPick={send} disabled={busy} /> : null}
          <Composer
            onSend={send}
            disabled={busy}
            isConversationMode={voice.isConversationMode}
            onToggleConversationMode={voice.toggleConversationMode}
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            interimTranscript={voice.transcript}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 12,
  },
  intro: { gap: 4, paddingVertical: 4 },
  heading: { fontSize: 24, lineHeight: 30, fontFamily: fonts.bold, color: "#0F2817" },
  sub: { fontSize: 14, fontFamily: fonts.regular, color: "#2C4032" },
  status: { fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },
  error: { gap: spacing.sm },
  errorText: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  retry: { minHeight: 44, justifyContent: "center" },
  retryText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.primary },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#E0EAE1",
  },
  voiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2F2E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#C5DEC9",
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  voiceDotListening: {
    backgroundColor: "#E53E3E",
  },
  voiceDotSpeaking: {
    backgroundColor: "#3182CE",
  },
  voiceBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  voiceBannerCloseBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  voiceBannerClose: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
});
