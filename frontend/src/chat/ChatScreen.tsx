import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api as apiClient } from "@/api/client";
import type { QuickAction, TransactionListData } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";
import { formatCents } from "@/widgets/common/Money";

import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { QuickActions } from "./QuickActions";
import { SeeAllPanel } from "./SeeAllPanel";
import type { WidgetHostApi } from "./registry";
import type { UseChat } from "./useChat";

interface Props {
  chat: UseChat;
  greeting?: string;
}

/** Chat UI: all data comes from the `chat` hook result passed in. */
export function ChatScreen({ chat, greeting }: Props) {
  const { messages, busy, error, send, sendChip, retry, started } = chat;
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
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {seeAll ? (
          <SeeAllPanel title={seeAll.title} filter={seeAll.filter} onClose={() => setSeeAll(null)} />
        ) : (
          <>
            {!started && greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}
            <MessageList messages={messages} api={host} onSend={send} onSeeAll={setSeeAll} />
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
            {!started ? <QuickActions onChip={sendChip} disabled={busy} /> : null}
          </>
        )}
      </ScrollView>
      {seeAll ? null : (
        <View style={styles.composer}>
          <Composer onSend={send} disabled={busy} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  greeting: { fontSize: fontSize.body, color: colors.text },
  status: { fontSize: fontSize.small, color: colors.textMuted },
  error: { gap: spacing.sm },
  errorText: { fontSize: fontSize.small, color: colors.text },
  retry: { minHeight: 44, justifyContent: "center" },
  retryText: { fontSize: fontSize.small, color: colors.primary, fontWeight: "600" },
  composer: { padding: spacing.md, backgroundColor: colors.surface },
});
