import Link from "next/link";
import { ClickableRow } from "@/components/app/clickable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDay, formatMoney } from "@/lib/format";
import type { ChargeCategory, ChargeOverview } from "@/types/domain";
import { ChargeRowActions } from "./charge-row-actions";
import { ChargeStatusBadge } from "./charge-status-badge";

export function chargeHref(charge: { id: string; category: ChargeCategory }) {
  return `/${charge.category === "rent" ? "rent" : "bills"}/${charge.id}`;
}

function home(charge: ChargeOverview) {
  return `${charge.property_name} · Unit ${charge.unit_number}`;
}

/** Charges as a table on wide screens and as a card list on phones. */
export function ChargesList({
  charges,
  currency,
  showType = false,
  today,
}: {
  charges: ChargeOverview[];
  currency: string;
  /** "YYYY-MM-DD" in the organization's time zone, for recording payments. */
  today: string;
  /** Show the bill type (utilities); rent rows are all "Rent". */
  showType?: boolean;
}) {
  const rowActions = (charge: ChargeOverview, className?: string) => (
    <ChargeRowActions
      label={`Actions for ${charge.tenant_name}, ${charge.type_label}`}
      href={chargeHref(charge)}
      chargeId={charge.id}
      outstanding={charge.status === "void" ? 0 : charge.outstanding}
      outstandingLabel={formatMoney(charge.outstanding, currency)}
      currency={currency}
      today={today}
      className={className}
    />
  );

  return (
    <>
      <ul className="grid grid-cols-1 gap-2 md:hidden">
        {charges.map((charge) => (
          <li key={charge.id} className="relative">
            <Link
              href={chargeHref(charge)}
              className="flex items-center gap-3 surface-interactive p-4 pr-14"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{charge.tenant_name}</span>
                  <ChargeStatusBadge status={charge.effective_status} />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {showType ? `${charge.type_label} · ` : ""}
                  {home(charge)}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  Due {formatDay(charge.due_date)}
                  {charge.amount_paid > 0 && ` · Paid ${formatMoney(charge.amount_paid, currency)}`}
                </p>
              </div>
              <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                {formatMoney(charge.amount, currency)}
              </span>
            </Link>
            {rowActions(charge, "absolute right-2 top-1/2 -translate-y-1/2")}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>{showType ? "Bill" : "Home"}</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => (
              <ClickableRow key={charge.id} href={chargeHref(charge)}>
                <TableCell className="font-medium">
                  <Link href={chargeHref(charge)} className="hover:underline">
                    {charge.tenant_name}
                  </Link>
                </TableCell>
                <TableCell>
                  {showType && <div>{charge.type_label}</div>}
                  <div className={showType ? "text-xs text-muted-foreground" : undefined}>
                    {home(charge)}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDay(charge.due_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(charge.amount, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(charge.amount_paid, currency)}
                </TableCell>
                <TableCell>
                  <ChargeStatusBadge status={charge.effective_status} />
                </TableCell>
                <TableCell className="py-2 text-right">{rowActions(charge)}</TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
