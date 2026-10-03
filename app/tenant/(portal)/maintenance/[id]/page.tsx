import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPhotosButton } from "@/features/maintenance/components/add-photos-button";
import { CancelRequestButton } from "@/features/maintenance/components/cancel-request-button";
import { CommentForm } from "@/features/maintenance/components/comment-form";
import { MaintenanceStatusBadge } from "@/features/maintenance/components/maintenance-status-badge";
import { PhotoGallery } from "@/features/maintenance/components/photo-gallery";
import { Timeline } from "@/features/maintenance/components/timeline";
import { getMyRequest } from "@/features/maintenance/queries";
import { CATEGORY_LABELS } from "@/features/maintenance/schema";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { requireRole } from "@/lib/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Maintenance request" };

export default async function TenantRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, request, tenancies] = await Promise.all([requireRole("tenant"), getMyRequest(id), getMyTenancies()]);
  if (!request) notFound();

  const timezone = tenancies[0]?.timezone;
  const authorLabel = (authorId: string | null) =>
    authorId === user.id ? "You" : authorId ? "Landlord" : "Update";
  const closed = request.status === "resolved" || request.status === "cancelled";

  return (
    <>
      <PageHeader
        title={request.title}
        description={request.home || undefined}
        back={{ href: "/tenant/maintenance", label: "Maintenance" }}
        actions={request.status === "pending" ? <CancelRequestButton requestId={request.id} /> : undefined}
      />
      <div className="grid max-w-3xl gap-6">
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
                { label: "Reported", value: formatDate(request.created_at, timezone) },
                ...(request.assigned_to ? [{ label: "Being handled by", value: request.assigned_to }] : []),
                ...(request.resolved_at ? [{ label: "Resolved", value: formatDate(request.resolved_at, timezone) }] : []),
                ...(request.description
                  ? [{ label: "Details", value: <span className="whitespace-pre-line font-normal">{request.description}</span> }]
                  : []),
              ]}
            />
            <PhotoGallery photos={request.photos} />
            {!closed && (
              <AddPhotosButton orgId={request.org_id} requestId={request.id} attached={request.photos.length} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Updates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Timeline updates={request.updates} authorLabel={authorLabel} timeZone={timezone} />
            {request.status !== "cancelled" && <CommentForm requestId={request.id} allowInternal={false} />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
