import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { coachColors, colors, fonts, spacing } from "@/theme";

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
    <View style={styles.pill}>
      <Icon name="message-outline" size={20} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        accessibilityLabel="Message"
        placeholder="Ask anything about your money..."
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
        style={[styles.send, canSend && styles.sendActive]}
      >
        <Icon name="arrow-up" size={20} color={canSend ? colors.onPrimary : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.text, minHeight: 40 },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: coachColors.sendButton,
  },
  sendActive: { backgroundColor: colors.primary },
});
