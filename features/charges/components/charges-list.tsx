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
import type { ChargeCategory, ChargeOverview } from "@/types/domain";
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
}: {
  charges: ChargeOverview[];
  currency: string;
  /** Show the bill type (utilities); rent rows are all "Rent". */
  showType?: boolean;
}) {
  return (
    <>
      <ul className="grid grid-cols-1 gap-2 md:hidden">
        {charges.map((charge) => (
          <li key={charge.id}>
            <Link
              href={chargeHref(charge)}
              className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
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
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>{showType ? "Bill" : "Home"}</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => (
              <TableRow key={charge.id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
