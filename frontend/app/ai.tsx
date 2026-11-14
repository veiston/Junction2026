import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatScreen } from "@/chat/ChatScreen";
import { useChat } from "@/chat/useChat";
import { greetingFor, useSession } from "@/chat/useSession";
import { HeaderBar } from "@/components/HeaderBar";
import { colors, fontSize, spacing } from "@/theme";

export default function AiScreen() {
  const session = useSession();
  const chat = useChat();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <HeaderBar title="AI" />
      <View style={styles.body}>
        {session.status === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} />
          </View>
        )}
        {session.status === "error" && (
          <View style={styles.center}>
            <Text style={styles.text}>{session.message}</Text>
            <Pressable onPress={session.retry} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {session.status === "ready" && <ChatScreen chat={chat} greeting={greetingFor(session.me)} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  text: { fontSize: fontSize.body, color: colors.text, textAlign: "center" },
  retry: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { fontSize: fontSize.body, color: colors.text },
});
