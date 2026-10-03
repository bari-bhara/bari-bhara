import { Building2 } from "lucide-react";
import { DetailList } from "@/components/app/detail-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenancyStatusBadge } from "@/features/tenants/components/tenancy-status-badge";
import { formatDay, formatMoney, ordinal } from "@/lib/format";
import type { MyTenancy } from "@/types/domain";

/** One of the tenant's homes, as they see it. */
export function HomeCard({ tenancy }: { tenancy: MyTenancy }) {
  const location = [tenancy.property_address, tenancy.property_city].filter(Boolean).join(", ");
  const details = [tenancy.unit_type, tenancy.floor && `Floor ${tenancy.floor}`]
    .filter(Boolean)
    .join(" · ");
  const active = tenancy.status === "active";

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {tenancy.property_name} · Unit {tenancy.unit_number}
            <TenancyStatusBadge status={tenancy.status} />
          </CardTitle>
          {location && <p className="text-sm text-muted-foreground">{location}</p>}
        </div>
      </CardHeader>
      <CardContent>
        <DetailList
          items={[
            { label: "Monthly rent", value: formatMoney(tenancy.monthly_rent, tenancy.currency) },
            ...(active
              ? [{ label: "Rent due", value: `${ordinal(tenancy.rent_due_day)} of each month` }]
              : []),
            { label: "Moved in", value: formatDay(tenancy.move_in_date) },
            ...(tenancy.move_out_date
              ? [{ label: "Moved out", value: formatDay(tenancy.move_out_date) }]
              : []),
            ...(details ? [{ label: "Unit", value: details }] : []),
            { label: "Landlord", value: tenancy.organization_name },
          ]}
        />
      </CardContent>
    </Card>
  );
}
