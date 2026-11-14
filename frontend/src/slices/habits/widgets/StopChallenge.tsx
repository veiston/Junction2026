import { useState } from "react";

import { postChatAsk } from "@/chat/chatAsk";
import type { WidgetHostApi } from "@/chat/registry";

import { plural } from "./format";
import { Body, ErrorText, SecondaryButton, StopButton } from "./ui";

interface Props {
  api: WidgetHostApi;
  challengeId: number;
  title: string;
  spentCents: number;
  daysLeft: number | null;
  /** Lets the card around it replace its own text once the challenge is stopped. */
  onStopped?: () => void;
}

/** What the customer sees once the challenge is skipped: a short note and a way forward. */
export function Skipped({ api }: { api: WidgetHostApi }) {
  return (
    <>
      <Body muted>Challenge skipped. There is no result and nothing is lost.</Body>
      <SecondaryButton label="Another challenge" onPress={() => api.sendChat({ message: "Show me another challenge to try" })} />
    </>
  );
}

/** "Skip challenge": ends the running challenge, tells the assistant, then shows what to do next. */
export function StopChallenge({ api, challengeId, title, spentCents, daysLeft, onStopped }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "stopped" | "failed">("idle");

  if (state === "stopped") return <Skipped api={api} />;
  return (
    <>
      <StopButton
        label={state === "busy" ? "Skipping..." : "Skip challenge"}
        disabled={state === "busy"}
        onPress={async () => {
          setState("busy");
          try {
            await api.request("POST", `/habits/challenges/${challengeId}/stop`);
            setState("stopped");
            onStopped?.();
            postChatAsk(
              "I skipped the challenge. What now?",
              `The customer skipped their 7-day challenge "${title}" before it ended` +
                `${daysLeft !== null ? `, with ${plural(daysLeft, "day", "days")} left` : ""}. ` +
                `They had spent ${api.formatCents(spentCents)} so far. It ends without a result and nothing is lost. ` +
                "They can start another challenge any time.",
            );
          } catch {
            setState("failed");
          }
        }}
      />
      {state === "failed" ? <ErrorText>Could not skip the challenge. Try again.</ErrorText> : null}
    </>
  );
}
