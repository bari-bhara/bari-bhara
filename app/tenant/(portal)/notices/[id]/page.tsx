import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MarkRead } from "@/features/notices/components/mark-read";
import { getMyNotice } from "@/features/notices/queries";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notice" };

export default async function TenantNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, tenancies] = await Promise.all([getMyNotice(id), getMyTenancies()]);
  if (!notice) notFound();

  return (
    <>
      <MarkRead noticeId={notice.id} isRead={notice.is_read} />
      <PageHeader
        title={notice.title}
        description={formatDateTime(notice.publish_at, tenancies[0]?.timezone)}
        back={{ href: "/tenant/notices", label: "Notices" }}
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <p className="whitespace-pre-line">{notice.body}</p>
        </CardContent>
      </Card>
    </>
  );
}
