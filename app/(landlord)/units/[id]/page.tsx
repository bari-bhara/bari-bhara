import { Pencil, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteUnitButton } from "@/features/units/components/delete-unit-button";
import { UnitStatusBadge } from "@/features/units/components/unit-status-badge";
import { getUnit } from "@/features/units/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Unit" };

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [unit, organization] = await Promise.all([getUnit(id), getCurrentOrganization()]);
  if (!unit) notFound();

  return (
    <>
      <PageHeader
        title={`Unit ${unit.unit_number}`}
        description={unit.property.name}
        back={{ href: `/properties/${unit.property.id}`, label: unit.property.name }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/units/${unit.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            <DeleteUnitButton unitId={unit.id} unitNumber={unit.unit_number} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Status", value: <UnitStatusBadge status={unit.status} /> },
                {
                  label: "Monthly rent",
                  value: formatMoney(unit.default_rent, organization?.currency),
                },
                { label: "Type", value: unit.unit_type || "—" },
                { label: "Bedrooms", value: unit.bedrooms ?? "—" },
                { label: "Floor", value: unit.floor || "—" },
                {
                  label: "Property",
                  value: (
                    <Link href={`/properties/${unit.property.id}`} className="hover:underline">
                      {unit.property.name}
                    </Link>
                  ),
                },
                {
                  label: "Notes",
                  value: unit.notes ? (
                    <span className="whitespace-pre-line font-normal">{unit.notes}</span>
                  ) : (
                    "—"
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No tenant"
              description="Tenants and tenancy history will appear here."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
