import { Bell, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { listMyNotices } from "@/features/notices/queries";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { formatDate } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notices" };

export default async function TenantNoticesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  const [{ rows: notices, total }, tenancies] = await Promise.all([listMyNotices(page), getMyTenancies()]);
  const timezone = tenancies[0]?.timezone;

  return (
    <>
      <PageHeader title="Notices" description="Announcements from your landlord." />
      {notices.length === 0 ? (
        <EmptyState icon={Bell} title="No notices" description="Notices from your landlord will appear here." />
      ) : (
        <div className="grid max-w-3xl gap-4">
          <ul className="grid grid-cols-1 gap-2" aria-label="Notices">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/tenant/notices/${notice.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50",
                    !notice.is_read && "border-primary/40",
                  )}
                >
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", notice.is_read ? "bg-transparent" : "bg-primary")}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate", notice.is_read ? "font-medium" : "font-semibold")}>
                      {notice.title}
                      {!notice.is_read && <span className="sr-only"> (unread)</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDate(notice.publish_at, timezone)} · {notice.body}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => withPage("/tenant/notices", p)} />
        </div>
      )}
    </>
  );
}
