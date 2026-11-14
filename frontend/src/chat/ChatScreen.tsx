import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api as apiClient } from "@/api/client";
import type { QuickAction, TransactionListData } from "@/contracts";
import { colors, fonts, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";

import { Composer } from "./Composer";
import { FunctionCards } from "./FunctionCards";
import { MessageList } from "./MessageList";
import { SeeAllPanel } from "./SeeAllPanel";
import { SuggestionChips } from "./SuggestionChips";
import type { WidgetHostApi } from "./registry";
import { registerChatNote } from "./chatNote";
import { QUICK_ACTION_TEXT, type UseChat } from "./useChat";

/** Chat UI: all data comes from the `chat` hook result passed in. */
const WAIT_TEXT: Record<string, string> = {
  [QUICK_ACTION_TEXT.improve_my_habits]: "Looking through your last 4 weeks to find one habit to test. This takes a few seconds.",
  [QUICK_ACTION_TEXT.understand_my_money]: "Looking at where your money went. This takes a few seconds.",
  [QUICK_ACTION_TEXT.plan_my_finances]: "Working out your plan. This takes a few seconds.",
};

export function ChatScreen({ chat }: { chat: UseChat }) {
  const { messages, busy, error, send, sendChip, note, retry, started } = chat;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const waitText = (lastUser && "text" in lastUser && WAIT_TEXT[lastUser.text]) || "Looking at your data. This takes a few seconds.";
  useEffect(() => registerChatNote(note), [note]);
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Record<string, number>>({});
  const listY = useRef(0);
  const scrolledTo = useRef<string | null>(null);
  const [seeAll, setSeeAll] = useState<TransactionListData | null>(null);

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
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          // Scroll to the start of the newest message so it is read from its first line.
          const last = messages[messages.length - 1];
          if (!started || seeAll || !last || scrolledTo.current === last.id) return;
          const y = ys.current[last.id];
          if (y === undefined) return;
          scrolledTo.current = last.id;
          scroll.current?.scrollTo({ y: Math.max(0, listY.current + y - 8), animated: true });
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
            <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
              <MessageList
                messages={messages}
                api={host}
                onSend={send}
                onSeeAll={setSeeAll}
                onMessageLayout={(id, y) => (ys.current[id] = y)}
              />
            </View>
            {busy ? (
              <View accessibilityRole="progressbar" accessibilityLabel="Looking at your data" style={styles.loading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.status}>{waitText}</Text>
              </View>
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
          {!started ? <SuggestionChips onPick={send} disabled={busy} /> : null}
          <Composer onSend={send} disabled={busy} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: 10 },
  intro: { gap: 4, paddingVertical: 4 },
  heading: { fontSize: 24, lineHeight: 30, fontFamily: fonts.medium, color: colors.text },
  sub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  status: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },
  error: { gap: spacing.sm },
  errorText: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  retry: { minHeight: 44, justifyContent: "center" },
  retryText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.primary },
  footer: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8, backgroundColor: colors.surface },
});
