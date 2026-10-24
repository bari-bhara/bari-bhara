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
import { formatMoney } from "@/lib/format";
import type { UnitWithProperty } from "../queries";
import { UnitStatusBadge } from "./unit-status-badge";

function actions(unit: UnitWithProperty) {
  return [
    { label: "View", href: `/units/${unit.id}` },
    { label: "Edit", href: `/units/${unit.id}/edit` },
    ...(unit.status === "vacant" || unit.status === "maintenance"
      ? [{ label: "Add tenant", href: `/tenants/new?unitId=${unit.id}` }]
      : []),
  ];
}

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
          <li key={unit.id} className="relative">
            <Link
              href={`/units/${unit.id}`}
              className="flex items-center gap-3 surface-interactive p-4 pr-14"
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
            </Link>
            <RowActions
              label={`Actions for Unit ${unit.unit_number}`}
              actions={actions(unit)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              {showProperty && <TableHead>Property</TableHead>}
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <ClickableRow key={unit.id} href={`/units/${unit.id}`}>
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
                <TableCell className="py-2 text-right">
                  <RowActions label={`Actions for Unit ${unit.unit_number}`} actions={actions(unit)} />
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
