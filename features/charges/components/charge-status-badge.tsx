import { StatusBadge, type Tone } from "@/components/app/status-badge";
import type { EffectiveStatus } from "@/types/domain";
import { EFFECTIVE_STATUS_LABELS } from "../schema";

const TONES: Record<EffectiveStatus, Tone> = {
  paid: "success",
  partially_paid: "info",
  unpaid: "warning",
  overdue: "danger",
  void: "neutral",
};

export function ChargeStatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <StatusBadge tone={TONES[status]} className={status === "void" ? "line-through" : undefined}>
      {EFFECTIVE_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
