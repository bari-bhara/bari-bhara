import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { NoticeForm } from "@/features/notices/components/notice-form";
import { getNotice, listTargets } from "@/features/notices/queries";
import { noticeState } from "@/features/notices/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { isoToZonedDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Edit notice" };

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, targets, organization] = await Promise.all([
    getNotice(id),
    listTargets(),
    getCurrentOrganization(),
  ]);
  if (!notice) notFound();
  // Published notices are read-only; their page explains why.
  if (noticeState(notice) !== "scheduled") redirect(`/notices/${notice.id}`);
  const timeZone = organization?.timezone ?? "Asia/Dhaka";

  return (
    <>
      <PageHeader
        title="Edit notice"
        description="You can change a notice until it's published."
        back={{ href: `/notices/${notice.id}`, label: notice.title }}
      />
      <NoticeForm
        targets={targets}
        timeZone={timeZone}
        noticeId={notice.id}
        defaultValues={{
          title: notice.title,
          body: notice.body,
          audience: notice.audience,
          propertyId: notice.property_id ?? "",
          unitIds: notice.unitIds,
          publishAt: isoToZonedDateTime(notice.publish_at, timeZone),
          expiresAt: notice.expires_at ? isoToZonedDateTime(notice.expires_at, timeZone) : "",
        }}
      />
    </>
  );
}
