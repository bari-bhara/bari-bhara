import Link from "next/link";
import { ClickableRow } from "@/components/app/clickable-row";
import { RowActions } from "@/components/app/row-actions";
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

function actions(tenant: TenantOverview) {
  return [
    { label: "View", href: `/tenants/${tenant.id}` },
    { label: "Edit", href: `/tenants/${tenant.id}/edit` },
    ...(tenant.tenancy_status === "active"
      ? []
      : [{ label: "Move into a unit", href: `/tenants/${tenant.id}/move-in` }]),
  ];
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
      <ul className="grid grid-cols-1 gap-2 md:hidden">
        {tenants.map((tenant) => (
          <li key={tenant.id} className="relative">
            <Link
              href={`/tenants/${tenant.id}`}
              className="flex items-center gap-3 surface-interactive p-4 pr-14"
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
                {tenant.email && (
                  <p className="truncate text-sm text-muted-foreground">{tenant.email}</p>
                )}
              </div>
              {tenant.monthly_rent !== null && tenant.tenancy_status === "active" && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(tenant.monthly_rent, currency)}
                </span>
              )}
            </Link>
            <RowActions
              label={`Actions for ${tenant.full_name}`}
              actions={actions(tenant)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Home</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <ClickableRow key={tenant.id} href={`/tenants/${tenant.id}`}>
                <TableCell className="font-medium">
                  <Link href={`/tenants/${tenant.id}`} className="hover:underline">
                    {tenant.full_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{home(tenant)}</div>
                  <div className="text-xs text-muted-foreground">{since(tenant)}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div>{tenant.phone || "—"}</div>
                  {tenant.email && <div className="text-xs">{tenant.email}</div>}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {tenant.monthly_rent !== null && tenant.tenancy_status === "active"
                    ? formatMoney(tenant.monthly_rent, currency)
                    : "—"}
                </TableCell>
                <TableCell>
                  {tenant.tenancy_status && <TenancyStatusBadge status={tenant.tenancy_status} />}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <RowActions label={`Actions for ${tenant.full_name}`} actions={actions(tenant)} />
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
