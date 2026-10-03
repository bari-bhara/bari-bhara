import { FilterChips } from "@/components/app/filter-chips";
import type { UnitStatus } from "@/types/domain";
import { UNIT_STATUSES, UNIT_STATUS_LABELS } from "../schema";

const SHORT_LABELS: Record<UnitStatus, string> = {
  ...UNIT_STATUS_LABELS,
  maintenance: "Maintenance",
};

/** "All / Vacant / Occupied / …" chips that set `?status=` on `basePath`. */
export function UnitStatusFilter({
  basePath,
  params = {},
  current,
  counts,
}: {
  basePath: string;
  /** Other query params to keep, e.g. the property filter. */
  params?: Record<string, string>;
  current: UnitStatus | null;
  counts: Record<UnitStatus, number>;
}) {
  const href = (status: UnitStatus | null) => {
    const query = new URLSearchParams(params);
    if (status) query.set("status", status);
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <FilterChips
      label="Filter by status"
      chips={[
        { label: "All", href: href(null), active: current === null, count: total },
        ...UNIT_STATUSES.map((status) => ({
          label: SHORT_LABELS[status],
          href: href(status),
          active: current === status,
          count: counts[status],
        })),
      ]}
    />
  );
}
