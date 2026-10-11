import { StatusBadge, type Tone } from "@/components/app/status-badge";
import type { TenancyStatus } from "@/types/domain";

const LABELS: Record<TenancyStatus, string> = { active: "Current", moved_out: "Moved out" };
const TONES: Record<TenancyStatus, Tone> = { active: "info", moved_out: "neutral" };

export function TenancyStatusBadge({ status }: { status: TenancyStatus }) {
  return <StatusBadge tone={TONES[status]}>{LABELS[status]}</StatusBadge>;
}
