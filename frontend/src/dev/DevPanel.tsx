import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/api/client";
import { postChatAsk } from "@/chat/chatAsk";
import { DEV_TOOLS } from "@/config";
import type { ChallengeList } from "@/contracts";

/** Purple on purpose: it must be obvious this is a developer tool, not part of the product. */
export const DEV_PURPLE = "#7B3FE4";

/**
 * Floating developer tools in the top-left corner, outside the chat. Hidden when EXPO_PUBLIC_DEV_TOOLS=0.
 * "Finish challenge" moves the demo clock to the end of the running challenge and asks the coach for the result.
 */
export function DevPanel() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!DEV_TOOLS) return null;

  async function finish() {
    setBusy(true);
    setNote(null);
    try {
      const list = await api.request<ChallengeList>("GET", "/habits/challenges");
      const running = list.items.find((i) => i.challenge.status === "active");
      if (!running) {
        setNote("No running challenge");
        return;
      }
      await api.request("PUT", "/demo/clock", { today: running.challenge.end_date });
      if (!postChatAsk("How is my challenge going?", "")) setNote("Open the AI tab first");
    } catch {
      setNote("Could not finish the challenge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none" testID="dev-panel">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="DEV: finish challenge"
        disabled={busy}
        onPress={() => void finish()}
        style={[styles.button, busy && styles.busy]}
      >
        <Text style={styles.text}>DEV: finish challenge</Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // On the web the page is wider than the phone-sized chat, so "fixed" keeps this in the page's corner.
    position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
    top: 12,
    left: 12,
    zIndex: 1000,
    gap: 6,
    alignItems: "flex-start",
  },
  button: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: DEV_PURPLE,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  busy: { opacity: 0.6 },
  text: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  note: { color: DEV_PURPLE, fontSize: 12 },
});
