import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { HeaderBar } from "@/components/HeaderBar";
import { Screen } from "@/components/Screen";
import {
  API_BASE_URL,
  COACH_URL,
  DEMO_CUSTOMER_ID,
  buildCoachUrl,
  describeSessionError,
  isTokenExpiredMessage,
  sessionEndpoint,
} from "@/config";
import { colors, fontSize, spacing } from "@/theme";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; url: string; nonce: number };

async function fetchToken(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let status: number | undefined;
  try {
    const res = await fetch(sessionEndpoint(API_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: DEMO_CUSTOMER_ID }),
      signal: controller.signal,
    });
    status = res.status;
    if (!res.ok) throw new Error("http");
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new Error("no token");
    return body.token;
  } catch (err) {
    throw new Error(describeSessionError(err, status));
  } finally {
    clearTimeout(timer);
  }
}

export default function AiScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchToken()
      .then((token) => {
        if (!cancelled) {
          setState({ kind: "ready", url: buildCoachUrl(COACH_URL, token), nonce: attempt });
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ kind: "error", message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Web: the coach iframe posts messages to window.parent.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMessage = (e: MessageEvent) => {
      if (isTokenExpiredMessage(e.data)) reload();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reload]);

  return (
    <Screen header={<HeaderBar title="AI" />}>
      <View style={styles.fill}>
        {state.kind === "loading" && <ActivityIndicator style={styles.center} color={colors.text} />}
        {state.kind === "error" && (
          <View style={styles.center}>
            <Text style={styles.text}>{state.message}</Text>
            <Pressable onPress={reload} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {state.kind === "ready" &&
          (Platform.OS === "web" ? (
            <iframe
              key={state.nonce}
              src={state.url}
              title="Coach"
              style={{ border: 0, width: "100%", height: "100%" }}
            />
          ) : (
            <WebView
              key={state.nonce}
              source={{ uri: state.url }}
              onMessage={(e) => {
                if (isTokenExpiredMessage(e.nativeEvent.data)) reload();
              }}
            />
          ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 400 },
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
