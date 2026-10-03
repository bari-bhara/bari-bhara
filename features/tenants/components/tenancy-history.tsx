import Link from "next/link";
import { formatDay, formatMoney } from "@/lib/format";
import type { Tenancy } from "@/types/domain";
import { TenancyStatusBadge } from "./tenancy-status-badge";

/**
 * A list of tenancies, newest first. `title` and `href` say what each row
 * links to: the unit (on a tenant's page) or the tenant (on a unit's page).
 */
export function TenancyHistory({
  tenancies,
  currency,
}: {
  tenancies: (Tenancy & { title: string; href: string })[];
  currency: string;
}) {
  return (
    <ol className="divide-y">
      {tenancies.map((tenancy) => (
        <li key={tenancy.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={tenancy.href} className="font-medium hover:underline">
              {tenancy.title}
            </Link>
            <TenancyStatusBadge status={tenancy.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDay(tenancy.move_in_date)} –{" "}
            {tenancy.move_out_date ? formatDay(tenancy.move_out_date) : "present"} ·{" "}
            {formatMoney(tenancy.monthly_rent, currency)}/month
          </p>
          {tenancy.status === "moved_out" && (tenancy.move_out_reason || tenancy.move_out_notes) && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {[tenancy.move_out_reason, tenancy.move_out_notes].filter(Boolean).join(": ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
