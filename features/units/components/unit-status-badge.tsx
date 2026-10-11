import { StatusBadge, type Tone } from "@/components/app/status-badge";
import type { UnitStatus } from "@/types/domain";
import { UNIT_STATUS_LABELS } from "../schema";

const TONES: Record<UnitStatus, Tone> = {
  vacant: "success",
  occupied: "info",
  maintenance: "warning",
  inactive: "neutral",
};

export function UnitStatusBadge({ status, className }: { status: UnitStatus; className?: string }) {
  return (
    <StatusBadge tone={TONES[status]} className={className}>
      {UNIT_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
