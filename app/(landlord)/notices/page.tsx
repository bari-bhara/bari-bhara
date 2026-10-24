import { Megaphone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { RowActions } from "@/components/app/row-actions";
import { Button } from "@/components/ui/button";
import { NoticeStateBadge } from "@/features/notices/components/notice-state-badge";
import { listNotices } from "@/features/notices/queries";
import { audienceSummary, noticeState } from "@/features/notices/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Notices" };

export default async function NoticesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  const [{ rows: notices, total }, organization] = await Promise.all([
    listNotices(page),
    getCurrentOrganization(),
  ]);
  const now = new Date();
  const newNotice = (
    <Button asChild>
      <Link href="/notices/new">
        <Plus aria-hidden /> New notice
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Notices" description="Announcements for your tenants." actions={newNotice} />
      {notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices yet"
          description="Create a notice to keep your tenants informed."
          action={newNotice}
        />
      ) : (
        <div className="grid gap-4">
          <ul className="grid grid-cols-1 gap-2">
            {notices.map((notice) => (
              <li key={notice.id} className="relative">
                <Link
                  href={`/notices/${notice.id}`}
                  className="flex items-center gap-3 surface-interactive p-4 pr-14"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{notice.title}</span>
                      <NoticeStateBadge state={noticeState(notice, now)} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {audienceSummary(notice)} · {formatDateTime(notice.publish_at, organization?.timezone)} ·{" "}
                      {notice.read_count} read
                    </p>
                  </div>
                </Link>
                <RowActions
                  label={`Actions for ${notice.title}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  actions={[
                    { label: "View", href: `/notices/${notice.id}` },
                    ...(noticeState(notice, now) === "scheduled"
                      ? [{ label: "Edit", href: `/notices/${notice.id}/edit` }]
                      : []),
                  ]}
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => withPage("/notices", p)} />
        </div>
      )}
    </>
  );
}
