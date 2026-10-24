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
import type { PropertyOverview } from "@/types/domain";

function location(property: PropertyOverview) {
  return [property.address, property.city].filter(Boolean).join(", ");
}

function actions(property: PropertyOverview) {
  return [
    { label: "View", href: `/properties/${property.id}` },
    { label: "Edit", href: `/properties/${property.id}/edit` },
    ...(property.archived_at ? [] : [{ label: "Add unit", href: `/units/new?propertyId=${property.id}` }]),
  ];
}

/** The list view of /properties: a table on wide screens, compact cards on phones. */
export function PropertiesTable({ properties }: { properties: PropertyOverview[] }) {
  return (
    <>
      <ul className="grid grid-cols-1 gap-2 md:hidden">
        {properties.map((property) => (
          <li key={property.id} className="relative">
            <Link
              href={`/properties/${property.id}`}
              className="block surface-interactive p-4 pr-14"
            >
              <p className="truncate font-semibold">{property.name}</p>
              <p className="truncate text-sm text-muted-foreground">{location(property) || "—"}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {property.unit_count} units · {property.occupied_count} occupied ·{" "}
                {property.vacant_count} vacant
              </p>
            </Link>
            <RowActions
              label={`Actions for ${property.name}`}
              actions={actions(property)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Occupied</TableHead>
              <TableHead className="text-right">Vacant</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <ClickableRow key={property.id} href={`/properties/${property.id}`}>
                <TableCell className="font-medium">
                  <Link href={`/properties/${property.id}`} className="hover:underline">
                    {property.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{location(property) || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{property.unit_count}</TableCell>
                <TableCell className="text-right tabular-nums">{property.occupied_count}</TableCell>
                <TableCell className="text-right tabular-nums">{property.vacant_count}</TableCell>
                <TableCell className="py-2 text-right">
                  <RowActions label={`Actions for ${property.name}`} actions={actions(property)} />
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
