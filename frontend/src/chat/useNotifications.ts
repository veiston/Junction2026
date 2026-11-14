import { useCallback, useEffect, useState } from "react";

import { api } from "@/api/client";
import type { Notification, NotificationList } from "@/contracts";

import { withSession } from "./session";

export type Notice = Notification;

/** How often the bell checks for new notices while the coach is open. */
export const REFRESH_MS = 60_000;

/**
 * Notices for the bell, from GET /notifications (built on the server from the customer's own data).
 * `refreshKey` changes whenever the conversation moves, so the list stays current; it also refreshes
 * every minute. Opening a notice marks it read on the server.
 */
export function useNotifications(enabled: boolean, refreshKey: number) {
  const [items, setItems] = useState<Notice[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    withSession(() => api.request<NotificationList>("GET", "/notifications"))
      .then((list) => {
        if (alive) setItems(list.items);
      })
      .catch(() => undefined); // the bell simply stays as it was
    return () => {
      alive = false;
    };
  }, [enabled, refreshKey, tick]);

  const dismiss = useCallback((id: string) => {
    setItems((cur) => cur.filter((n) => n.id !== id));
    withSession(() => api.request("POST", `/notifications/${encodeURIComponent(id)}/read`)).catch(() => undefined);
  }, []);

  return { items, dismiss };
}
