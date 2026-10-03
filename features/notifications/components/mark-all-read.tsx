"use client";

import { useEffect, useRef } from "react";
import { markAllNotificationsRead } from "../actions";

/** Marks the tenant's notifications read once the list has been shown. */
export function MarkAllRead({ unread }: { unread: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (unread === 0 || sent.current) return;
    sent.current = true;
    void markAllNotificationsRead();
  }, [unread]);
  return null;
}
