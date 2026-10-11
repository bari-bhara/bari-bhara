import { StatusBadge, type Tone } from "@/components/app/status-badge";
import type { MaintenanceStatus } from "@/types/domain";
import { STATUS_LABELS } from "../schema";

const TONES: Record<MaintenanceStatus, Tone> = {
  pending: "warning",
  in_progress: "info",
  resolved: "success",
  cancelled: "neutral",
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return <StatusBadge tone={TONES[status]}>{STATUS_LABELS[status]}</StatusBadge>;
}
