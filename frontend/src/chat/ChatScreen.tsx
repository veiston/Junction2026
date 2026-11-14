import { useCallback, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api as apiClient } from "@/api/client";
import type { QuickAction, TransactionListData } from "@/contracts";
import { colors, fonts, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";

import { Composer } from "./Composer";
import { FUNCTIONS, FunctionCards } from "./FunctionCards";
import { MessageList } from "./MessageList";
import { SeeAllPanel } from "./SeeAllPanel";
import { SuggestionChips } from "./SuggestionChips";
import { TypingBubble } from "./TypingBubble";
import type { WidgetHostApi } from "./registry";
import { typingSteps } from "./typingSteps";
import type { UseChat } from "./useChat";

/** Chat UI: all data comes from the `chat` hook result passed in. `today` (demo clock) names the month. */
export function ChatScreen({ chat, today }: { chat: UseChat; today?: string }) {
  const { messages, busy, error, send, sendChip, pending, retry, started } = chat;
  const [seeAll, setSeeAll] = useState<TransactionListData | null>(null);
  const scroll = useRef<ScrollView>(null);

  /** A function card or a widget's quick action: show the customer's prompt first, then ask. */
  const pick = useCallback(
    (action: QuickAction) => sendChip(action, FUNCTIONS.find((f) => f.action === action)?.prompt),
    [sendChip],
  );

  const host: WidgetHostApi = useMemo(
    () => ({
      request: apiClient.request,
      sendChat: (req) => (req.quick_action ? pick(req.quick_action as QuickAction) : send(req.message ?? "")),
      formatCents,
    }),
    [send, pick],
  );

  const steps = useMemo(() => typingSteps(pending, today), [pending, today]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // Like a messaging app: keep the newest bubble in view.
        onContentSizeChange={() => {
          if (started && !seeAll) scroll.current?.scrollToEnd({ animated: true });
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
                <FunctionCards onPick={pick} disabled={busy} />
              </>
            ) : null}
            <MessageList messages={messages} api={host} onSend={send} onSeeAll={setSeeAll} />
            {busy ? <TypingBubble steps={steps} /> : null}
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
          {!started ? <SuggestionChips onPick={send} disabled={busy} /> : null}
          <Composer onSend={send} disabled={busy} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: 10 },
  intro: { gap: 4, paddingVertical: 4 },
  heading: { fontSize: 24, lineHeight: 30, fontFamily: fonts.medium, color: colors.text },
  sub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  error: { gap: spacing.sm },
  errorText: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  retry: { minHeight: 44, justifyContent: "center" },
  retryText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.primary },
  footer: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8, backgroundColor: colors.surface },
});
