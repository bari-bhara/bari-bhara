import { StatusBadge, type Tone } from "@/components/app/status-badge";
import type { NoticeState } from "../schema";

const LABELS: Record<NoticeState, string> = { scheduled: "Scheduled", live: "Live", expired: "Expired" };
const TONES: Record<NoticeState, Tone> = { scheduled: "highlight", live: "success", expired: "neutral" };

export function NoticeStateBadge({ state }: { state: NoticeState }) {
  return <StatusBadge tone={TONES[state]}>{LABELS[state]}</StatusBadge>;
}
