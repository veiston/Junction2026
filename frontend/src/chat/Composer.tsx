import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextStyle } from "react-native";

import { Icon } from "@/components/Icon";
import { SvgMicIcon } from "@/components/SvgMicIcon";
import { coachColors, colors, fonts, spacing } from "@/theme";

/**
 * Browsers draw a focus ring with `outline-style: auto`, which ignores `outline-width`, so it must be
 * switched off with `outline-style: none`. React Native's types do not list "none", so it is web-only here.
 */
export const WEB_NO_FOCUS_RING = { outlineStyle: "none", outlineWidth: 0 } as const;
const NO_FOCUS_RING = Platform.select<TextStyle>({
  web: WEB_NO_FOCUS_RING as unknown as TextStyle,
  default: {},
});

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
  // Live speech only shows while voice mode is on, so it can never take over what the customer types.
  const displayText = (isConversationMode && interimTranscript) || text;
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
      if (isSpeaking) return "AI is speaking… tap the banner to interrupt";
      return "Conversation mode active…";
    }
    return "Ask anything about your money...";
  };

  return (
    <View style={[styles.pill, isConversationMode && styles.pillActive]}>
      <TextInput
        style={[styles.input, NO_FOCUS_RING]}
        // A plain blinking text cursor in the brand colour, no extra focus border.
        cursorColor={colors.primary}
        selectionColor={colors.primary}
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
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 40,
  },
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
