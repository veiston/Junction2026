import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/theme";

export function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const canSend = !disabled && text.trim().length > 0;
  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        accessibilityLabel="Message"
        placeholder="Ask about your money…"
        placeholderTextColor={colors.textSubtle}
        maxLength={1000}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="send"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        disabled={!canSend}
        onPress={submit}
        style={[styles.send, !canSend && styles.disabled]}
      >
        <Text style={styles.sendText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    fontSize: fontSize.small,
    color: colors.text,
  },
  send: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.4 },
  sendText: { color: colors.onPrimary, fontSize: fontSize.small, fontWeight: "600" },
});
