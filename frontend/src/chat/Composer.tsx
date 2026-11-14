import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { SvgMicIcon } from "@/components/SvgMicIcon";
import { coachColors, colors, fonts, spacing } from "@/theme";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isConversationMode?: boolean;
  onToggleConversationMode?: () => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  interimTranscript?: string;
}

export function Composer({
  onSend,
  disabled,
  isConversationMode = false,
  onToggleConversationMode,
  isListening = false,
  isSpeaking = false,
  interimTranscript = "",
}: ComposerProps) {
  const [text, setText] = useState("");
  const displayText = interimTranscript || text;
  const canSend = !disabled && displayText.trim().length > 0;

  const submit = () => {
    const t = displayText.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  const getPlaceholder = () => {
    if (isConversationMode) {
      if (isListening) return "Listening to your voice… speak now";
      if (isSpeaking) return "AI is speaking…";
      return "Conversation mode active…";
    }
    return "Ask anything about your money...";
  };

  return (
    <View style={[styles.pill, isConversationMode && styles.pillActive]}>
      <Icon name="message-outline" size={20} color={isConversationMode ? colors.primary : colors.textMuted} />
      <TextInput
        style={styles.input}
        accessibilityLabel="Message"
        placeholder={getPlaceholder()}
        placeholderTextColor={isConversationMode ? colors.primary : colors.textSubtle}
        maxLength={1000}
        value={displayText}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="send"
      />
      {/* Button to the left of the send button to activate voice conversation mode */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isConversationMode ? "Deactivate voice conversation mode" : "Activate voice conversation mode"
        }
        onPress={onToggleConversationMode}
        style={[styles.micButton, isConversationMode && styles.micButtonActive]}
      >
        <SvgMicIcon
          size={18}
          color={isConversationMode ? colors.onPrimary : colors.textMuted}
          active={isConversationMode}
        />
      </Pressable>
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
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: "#F2F9F4",
  },
  input: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.text, minHeight: 40 },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: coachColors.sendButton,
  },
  micButtonActive: {
    backgroundColor: colors.primary,
  },
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
