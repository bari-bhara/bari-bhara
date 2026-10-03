import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDay, formatMoney } from "@/lib/format";
import type { TenantOverview } from "@/types/domain";
import { TenancyStatusBadge } from "./tenancy-status-badge";

function home(tenant: TenantOverview) {
  return tenant.property_name ? `${tenant.property_name} · Unit ${tenant.unit_number}` : "—";
}

function since(tenant: TenantOverview) {
  if (tenant.tenancy_status === "moved_out" && tenant.move_out_date) {
    return `Left ${formatDay(tenant.move_out_date)}`;
  }
  return tenant.move_in_date ? `Since ${formatDay(tenant.move_in_date)}` : "";
}

/** Tenants as a table on wide screens and as a card list on phones. */
export function TenantsList({ tenants, currency }: { tenants: TenantOverview[]; currency: string }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {tenants.map((tenant) => (
          <li key={tenant.id}>
            <Link
              href={`/tenants/${tenant.id}`}
              className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{tenant.full_name}</span>
                  {tenant.tenancy_status && <TenancyStatusBadge status={tenant.tenancy_status} />}
                </div>
                <p className="truncate text-sm text-muted-foreground">{home(tenant)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[tenant.phone, since(tenant)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {tenant.monthly_rent !== null && tenant.tenancy_status === "active" && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(tenant.monthly_rent, currency)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Home</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">
                  <Link href={`/tenants/${tenant.id}`} className="hover:underline">
                    {tenant.full_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{home(tenant)}</div>
                  <div className="text-xs text-muted-foreground">{since(tenant)}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{tenant.phone || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {tenant.monthly_rent !== null && tenant.tenancy_status === "active"
                    ? formatMoney(tenant.monthly_rent, currency)
                    : "—"}
                </TableCell>
                <TableCell>
                  {tenant.tenancy_status && <TenancyStatusBadge status={tenant.tenancy_status} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
