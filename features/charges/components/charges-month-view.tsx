import { Receipt, SearchX, Zap } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { formatMonth, todayIn } from "@/lib/format";
import { getCurrentOrganization } from "@/lib/dal";
import type { ChargeCategory } from "@/types/domain";
import { listMonthCharges, totalCharges } from "../queries";
import {
  CHARGE_FILTER_STATUSES,
  EFFECTIVE_STATUS_LABELS,
  isChargeFilterStatus,
  isMonth,
} from "../schema";
import { ChargeStats } from "./charge-stats";
import { ChargesList } from "./charges-list";
import { MonthNav } from "./month-nav";

export type ChargesMonthParams = { month?: string; status?: string; property?: string };

/**
 * A month of rent or bills: month switcher, totals, status/property filters
 * and the list. Filters live in the URL.
 */
export async function ChargesMonthView({
  category,
  params,
  emptyAction,
}: {
  category: ChargeCategory;
  params: ChargesMonthParams;
  /** Shown in the empty state, e.g. "Generate rent". */
  emptyAction?: (month: string) => React.ReactNode;
}) {
  const organization = await getCurrentOrganization();
  const currency = organization?.currency ?? "BDT";
  const currentMonth = todayIn(organization?.timezone).slice(0, 7);
  const month = isMonth(params.month) ? params.month : currentMonth;
  const status = isChargeFilterStatus(params.status) ? params.status : null;

  const charges = await listMonthCharges(category, month);
  const properties = [...new Map(charges.map((c) => [c.property_id, c.property_name])).entries()];
  const propertyId = properties.some(([id]) => id === params.property) ? params.property! : null;

  const inProperty = propertyId ? charges.filter((c) => c.property_id === propertyId) : charges;
  const totals = totalCharges(inProperty);
  const visible = status ? inProperty.filter((c) => c.effective_status === status) : inProperty;

  const basePath = category === "rent" ? "/rent" : "/bills";
  const href = (changes: Partial<Record<keyof ChargesMonthParams, string | null>>) => {
    const next = {
      month: month === currentMonth ? null : month,
      status,
      property: propertyId,
      ...changes,
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <MonthNav
        month={month}
        currentMonth={currentMonth}
        // A new month starts unfiltered.
        href={(m) => href({ month: m === currentMonth ? null : m, status: null, property: null })}
      />
      {charges.length === 0 ? (
        <EmptyState
          icon={category === "rent" ? Receipt : Zap}
          title={category === "rent" ? "No rent for this month yet" : "No bills for this month"}
          description={
            category === "rent"
              ? `Generate rent to bill every current tenant for ${formatMonth(month)}.`
              : "Bills you add for this month will appear here."
          }
          action={emptyAction?.(month)}
        />
      ) : (
        <>
          <ChargeStats totals={totals} currency={currency} />
          <FilterChips
            label="Filter by status"
            chips={[
              { label: "All", href: href({ status: null }), active: !status, count: inProperty.length },
              ...CHARGE_FILTER_STATUSES.map((s) => ({
                label: EFFECTIVE_STATUS_LABELS[s],
                href: href({ status: s }),
                active: status === s,
                count: totals.counts[s],
              })),
            ]}
          />
          {properties.length > 1 && (
            <FilterChips
              label="Filter by property"
              chips={[
                { label: "All properties", href: href({ property: null }), active: !propertyId },
                ...properties.map(([id, name]) => ({
                  label: name,
                  href: href({ property: id }),
                  active: propertyId === id,
                })),
              ]}
            />
          )}
          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              description="No charges this month have that status."
            />
          ) : (
            <ChargesList charges={visible} currency={currency} showType={category === "utility"} />
          )}
        </>
      )}
    </div>
  );
}
