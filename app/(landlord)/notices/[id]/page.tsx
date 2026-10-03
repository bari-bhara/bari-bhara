import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteNoticeButton } from "@/features/notices/components/delete-notice-button";
import { NoticeStateBadge } from "@/features/notices/components/notice-state-badge";
import { getNotice } from "@/features/notices/queries";
import { audienceSummary, noticeState } from "@/features/notices/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notice" };

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, organization] = await Promise.all([getNotice(id), getCurrentOrganization()]);
  if (!notice) notFound();
  const timezone = organization?.timezone;

  return (
    <>
      <PageHeader
        title={notice.title}
        back={{ href: "/notices", label: "Notices" }}
        actions={<DeleteNoticeButton noticeId={notice.id} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardContent className="pt-6">
            <p className="whitespace-pre-line">{notice.body}</p>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Details <NoticeStateBadge state={noticeState(notice)} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                {
                  label: "Audience",
                  value:
                    notice.audience === "units" ? (
                      <ul className="grid gap-0.5">
                        {notice.units.map((unit) => (
                          <li key={unit}>{unit}</li>
                        ))}
                      </ul>
                    ) : (
                      audienceSummary(notice)
                    ),
                },
                { label: "Published", value: formatDateTime(notice.publish_at, timezone) },
                { label: "Hidden after", value: notice.expires_at ? formatDateTime(notice.expires_at, timezone) : "Never" },
                { label: "Read by", value: `${notice.read_count} ${notice.read_count === 1 ? "tenant" : "tenants"}` },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
