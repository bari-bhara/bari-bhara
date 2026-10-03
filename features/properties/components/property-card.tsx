import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PropertyOverview } from "@/types/domain";

export function PropertyCard({ property }: { property: PropertyOverview }) {
  const location = [property.address, property.city].filter(Boolean).join(", ");

  return (
    <Card className="relative transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">
            {/* Stretched link: the whole card is clickable, with one accessible name. */}
            <Link href={`/properties/${property.id}`} className="after:absolute after:inset-0">
              {property.name}
            </Link>
          </h2>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-3 border-t text-center">
        <Stat label="Units" value={property.unit_count} />
        <Stat label="Occupied" value={property.occupied_count} />
        <Stat label="Vacant" value={property.vacant_count} />
      </dl>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-3 [&:not(:first-child)]:border-l">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
