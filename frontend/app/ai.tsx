import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/api/client";
import { setToken } from "@/auth/token";
import { HeaderBar } from "@/components/HeaderBar";
import { Screen } from "@/components/Screen";
import { DEMO_CUSTOMER_ID } from "@/config";
import type { Me } from "@/contracts";
import { colors, fontSize, spacing } from "@/theme";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; me: Me };

export default function AiScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await api.createDemoSession(DEMO_CUSTOMER_ID);
        setToken(session.token);
        const me = await api.getMe();
        if (!cancelled) setState({ kind: "ready", me });
      } catch (e) {
        setToken(null);
        if (!cancelled) {
          setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <Screen header={<HeaderBar title="AI" />}>
      <View style={styles.center}>
        {state.kind === "loading" && <ActivityIndicator color={colors.text} />}
        {state.kind === "error" && (
          <>
            <Text style={styles.text}>{state.message}</Text>
            <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </>
        )}
        {state.kind === "ready" && (
          <Text style={styles.text}>
            Hi, {state.me.customer_id}! Your {state.me.region} coach is getting ready.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  text: { fontSize: fontSize.body, color: colors.text, textAlign: "center" },
  retry: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { fontSize: fontSize.body, color: colors.text },
});
