"use client";

import { useEffect, useRef } from "react";
import { markNoticeRead } from "../actions";

/**
 * Marks a notice read once it's actually shown. Done from the browser, not
 * during server rendering, so link prefetching can't mark notices read.
 */
export function MarkRead({ noticeId, isRead }: { noticeId: string; isRead: boolean }) {
  const sent = useRef(false);
  useEffect(() => {
    if (isRead || sent.current) return;
    sent.current = true;
    void markNoticeRead(noticeId);
  }, [noticeId, isRead]);
  return null;
}
