import { useState } from "react";

import { postChatAsk } from "@/chat/chatAsk";
import type { WidgetHostApi } from "@/chat/registry";

import { plural } from "./format";
import { Body, ErrorText, StopButton } from "./ui";

interface Props {
  api: WidgetHostApi;
  challengeId: number;
  title: string;
  spentCents: number;
  daysLeft: number | null;
  /** Lets the card around it replace its own text once the challenge is stopped. */
  onStopped?: () => void;
}

/** "Stop challenge": ends the running challenge, tells the assistant, then replaces itself with a short note. */
export function StopChallenge({ api, challengeId, title, spentCents, daysLeft, onStopped }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "stopped" | "failed">("idle");

  if (state === "stopped") return <Body muted>Challenge stopped.</Body>;
  return (
    <>
      <StopButton
        label={state === "busy" ? "Stopping..." : "Stop challenge"}
        disabled={state === "busy"}
        onPress={async () => {
          setState("busy");
          try {
            await api.request("POST", `/habits/challenges/${challengeId}/stop`);
            setState("stopped");
            onStopped?.();
            postChatAsk(
              "I stopped the challenge. What now?",
              `The customer stopped their 7-day challenge "${title}" before it ended` +
                `${daysLeft !== null ? `, with ${plural(daysLeft, "day", "days")} left` : ""}. ` +
                `They had spent ${api.formatCents(spentCents)} so far. It ends without a result and nothing is lost. ` +
                "They can start another challenge any time.",
            );
          } catch {
            setState("failed");
          }
        }}
      />
      {state === "failed" ? <ErrorText>Could not stop the challenge. Try again.</ErrorText> : null}
    </>
  );
}
