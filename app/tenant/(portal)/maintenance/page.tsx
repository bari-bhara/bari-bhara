import { ChevronRight, Plus, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { Button } from "@/components/ui/button";
import { MaintenanceStatusBadge } from "@/features/maintenance/components/maintenance-status-badge";
import { listMyRequests } from "@/features/maintenance/queries";
import { CATEGORY_LABELS } from "@/features/maintenance/schema";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { formatDate } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Maintenance" };

export default async function TenantMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const [{ rows: requests, total }, tenancies] = await Promise.all([listMyRequests(page), getMyTenancies()]);
  const canReport = tenancies.some((t) => t.status === "active");
  const timezone = tenancies[0]?.timezone;
  const report = canReport && (
    <Button asChild>
      <Link href="/tenant/maintenance/new">
        <Plus aria-hidden /> Report a problem
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Maintenance" description="Report and track issues in your home." actions={report || undefined} />
      {requests.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No requests yet"
          description="Report a problem and track its progress here."
          action={report || undefined}
        />
      ) : (
        <div className="grid max-w-3xl gap-4">
          <ul className="grid grid-cols-1 gap-2">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/tenant/maintenance/${request.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{request.title}</span>
                      <MaintenanceStatusBadge status={request.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {CATEGORY_LABELS[request.category]} · {formatDate(request.created_at, timezone)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            href={(p) => withPage("/tenant/maintenance", p)}
          />
        </div>
      )}
    </>
  );
}
