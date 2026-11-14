import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/api/client";
import type { ChallengeList } from "@/contracts";

export interface Notice {
  id: string;
  text: string;
}

/**
 * In-app notices for the bell. Today there is one kind: a challenge has ended and its result has not been seen.
 * `refreshKey` changes whenever the conversation moves, so the list stays current.
 */
export function useNotifications(enabled: boolean, refreshKey: number) {
  const [items, setItems] = useState<Notice[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api
      .request<ChallengeList>("GET", "/habits/challenges")
      .then((list) => {
        if (!alive) return;
        const finished = list.items.filter((i) => i.challenge.status === "won" || i.challenge.status === "lost");
        const latest = finished.sort((a, b) => b.challenge.id - a.challenge.id)[0];
        const id = latest ? `challenge-${latest.challenge.id}` : null;
        setItems(
          latest && id && !seen.current.has(id)
            ? [{ id, text: `Your challenge "${latest.challenge.title}" has ended. See the result.` }]
            : [],
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled, refreshKey]);

  const dismiss = useCallback((id: string) => {
    seen.current.add(id);
    setItems((cur) => cur.filter((n) => n.id !== id));
  }, []);

  return { items, dismiss };
}
