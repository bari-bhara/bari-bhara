import { AlertTriangle, CircleCheck, Receipt, Wallet } from "lucide-react";
import { StatCard } from "@/components/app/stat-card";
import { formatMoney } from "@/lib/format";
import type { ChargeTotals } from "../queries";

export function ChargeStats({ totals, currency }: { totals: ChargeTotals; currency: string }) {
  const percent = totals.billed > 0 ? Math.round((totals.collected / totals.billed) * 100) : 0;
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Billed" value={formatMoney(totals.billed, currency)} icon={Receipt} />
      <StatCard
        label="Collected"
        value={formatMoney(totals.collected, currency)}
        hint={totals.billed > 0 ? `${percent}% of billed` : undefined}
        icon={CircleCheck}
      />
      <StatCard label="Outstanding" value={formatMoney(totals.outstanding, currency)} icon={Wallet} />
      <StatCard
        label="Overdue"
        value={formatMoney(totals.overdue, currency)}
        hint={`${totals.overdueCount} ${totals.overdueCount === 1 ? "charge" : "charges"}`}
        icon={AlertTriangle}
      />
    </section>
  );
}
