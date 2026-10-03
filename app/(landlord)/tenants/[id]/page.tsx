import { DoorOpen, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitePanel } from "@/features/tenants/components/invite-panel";
import { MoveOutDialog } from "@/features/tenants/components/move-out-dialog";
import { TenancyHistory } from "@/features/tenants/components/tenancy-history";
import { TenancyStatusBadge } from "@/features/tenants/components/tenancy-status-badge";
import { getTenant } from "@/features/tenants/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDate, formatDay, formatMoney, todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Tenant" };

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant, organization] = await Promise.all([getTenant(id), getCurrentOrganization()]);
  if (!tenant) notFound();

  const currency = organization?.currency ?? "BDT";
  const timezone = organization?.timezone;
  const current = tenant.tenancies.find((t) => t.status === "active");
  const unitLabel = current
    ? `${current.unit.property.name} · Unit ${current.unit.unit_number}`
    : null;

  return (
    <>
      <PageHeader
        title={tenant.full_name}
        description={unitLabel ?? "Not living in any of your units"}
        back={{ href: "/tenants", label: "Tenants" }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/tenants/${tenant.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            {current && unitLabel ? (
              <MoveOutDialog
                tenancyId={current.id}
                tenantName={tenant.full_name}
                unitLabel={unitLabel}
                today={todayIn(timezone)}
              />
            ) : (
              <Button asChild>
                <Link href={`/tenants/${tenant.id}/move-in`}>
                  <DoorOpen aria-hidden /> Move into a unit
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current tenancy {current && <TenancyStatusBadge status="active" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {current ? (
              <DetailList
                items={[
                  {
                    label: "Home",
                    value: (
                      <Link href={`/units/${current.unit.id}`} className="hover:underline">
                        {unitLabel}
                      </Link>
                    ),
                  },
                  { label: "Monthly rent", value: formatMoney(current.monthly_rent, currency) },
                  { label: "Security deposit", value: formatMoney(current.security_deposit, currency) },
                  { label: "Moved in", value: formatDay(current.move_in_date) },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No current tenancy. Use “Move into a unit” to start one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                {
                  label: "Phone",
                  value: tenant.phone ? (
                    <a href={`tel:${tenant.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {tenant.phone}
                    </a>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Email",
                  value: tenant.email ? (
                    <a href={`mailto:${tenant.email}`} className="break-all hover:underline">
                      {tenant.email}
                    </a>
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      No email on file: they won&apos;t get email reminders.
                    </span>
                  ),
                },
                {
                  label: "Notes",
                  value: tenant.notes ? (
                    <span className="whitespace-pre-line font-normal">{tenant.notes}</span>
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
            <CardTitle>App access</CardTitle>
          </CardHeader>
          <CardContent>
            <InvitePanel
              tenantId={tenant.id}
              tenantName={tenant.full_name}
              hasLogin={tenant.user_id !== null}
              pendingInviteExpiry={
                tenant.pendingInvite ? formatDate(tenant.pendingInvite.expires_at, timezone) : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenancy history</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.tenancies.length === 0 ? (
              <EmptyState icon={DoorOpen} title="No tenancies" description="They haven't lived in any of your units." />
            ) : (
              <TenancyHistory
                currency={currency}
                tenancies={tenant.tenancies.map((t) => ({
                  ...t,
                  title: `${t.unit.property.name} · Unit ${t.unit.unit_number}`,
                  href: `/units/${t.unit.id}`,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
