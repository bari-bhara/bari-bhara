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
import { formatMoney } from "@/lib/format";
import type { UnitWithProperty } from "../queries";
import { UnitStatusBadge } from "./unit-status-badge";

function details(unit: UnitWithProperty) {
  return [
    unit.unit_type,
    unit.bedrooms !== null && `${unit.bedrooms} bed`,
    unit.floor && `Floor ${unit.floor}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Units as a table on wide screens and as a card list on phones. */
export function UnitsList({
  units,
  currency,
  showProperty = false,
}: {
  units: UnitWithProperty[];
  currency: string;
  showProperty?: boolean;
}) {
  return (
    <>
      <ul className="grid grid-cols-1 gap-2 md:hidden">
        {units.map((unit) => (
          <li key={unit.id}>
            <Link
              href={`/units/${unit.id}`}
              className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Unit {unit.unit_number}</span>
                  <UnitStatusBadge status={unit.status} />
                </div>
                {showProperty && (
                  <p className="truncate text-sm text-muted-foreground">{unit.property.name}</p>
                )}
                <p className="truncate text-sm text-muted-foreground">{details(unit) || "—"}</p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatMoney(unit.default_rent, currency)}
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
              <TableHead>Unit</TableHead>
              {showProperty && <TableHead>Property</TableHead>}
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">
                  <Link href={`/units/${unit.id}`} className="hover:underline">
                    Unit {unit.unit_number}
                  </Link>
                </TableCell>
                {showProperty && (
                  <TableCell>
                    <Link href={`/properties/${unit.property.id}`} className="hover:underline">
                      {unit.property.name}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">{details(unit) || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(unit.default_rent, currency)}
                </TableCell>
                <TableCell>
                  <UnitStatusBadge status={unit.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
