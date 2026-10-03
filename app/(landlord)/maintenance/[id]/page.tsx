import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPhotosButton } from "@/features/maintenance/components/add-photos-button";
import { AssignForm } from "@/features/maintenance/components/assign-form";
import { CommentForm } from "@/features/maintenance/components/comment-form";
import { MaintenanceStatusBadge } from "@/features/maintenance/components/maintenance-status-badge";
import { PhotoGallery } from "@/features/maintenance/components/photo-gallery";
import { StatusForm } from "@/features/maintenance/components/status-form";
import { Timeline } from "@/features/maintenance/components/timeline";
import { getRequestForLandlord } from "@/features/maintenance/queries";
import { CATEGORY_LABELS } from "@/features/maintenance/schema";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Maintenance request" };

export default async function MaintenanceRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, request, organization] = await Promise.all([
    requireRole("landlord"),
    getRequestForLandlord(id),
    getCurrentOrganization(),
  ]);
  if (!request) notFound();

  const timezone = organization?.timezone;
  const authorLabel = (authorId: string | null) => {
    if (!authorId) return "Update";
    if (authorId === user.id) return "You";
    if (authorId === request.tenantUserId) return request.tenant_name ?? "Tenant";
    return "Landlord";
  };

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.property_name} · Unit ${request.unit_number}`}
        back={{ href: "/maintenance", label: "Maintenance" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Details <MaintenanceStatusBadge status={request.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailList
                items={[
                  { label: "Category", value: CATEGORY_LABELS[request.category] },
                  {
                    label: "Tenant",
                    value: request.tenant_id ? (
                      <Link href={`/tenants/${request.tenant_id}`} className="hover:underline">
                        {request.tenant_name}
                      </Link>
                    ) : (
                      "No tenant (raised by you)"
                    ),
                  },
                  { label: "Reported", value: formatDate(request.created_at, timezone) },
                  ...(request.resolved_at
                    ? [{ label: "Resolved", value: formatDate(request.resolved_at, timezone) }]
                    : []),
                  ...(request.description
                    ? [{ label: "Details", value: <span className="whitespace-pre-line font-normal">{request.description}</span> }]
                    : []),
                ]}
              />
              <PhotoGallery photos={request.photos} />
              <AddPhotosButton orgId={request.org_id} requestId={request.id} attached={request.photos.length} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Updates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Timeline updates={request.updates} authorLabel={authorLabel} timeZone={timezone} />
              <CommentForm requestId={request.id} allowInternal />
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Manage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <StatusForm requestId={request.id} status={request.status} />
            <AssignForm requestId={request.id} assignedTo={request.assigned_to} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
