import { ChevronRight, ImageIcon, MessageSquare, Plus, SearchX, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { Button } from "@/components/ui/button";
import { listPropertyOptions } from "@/features/properties/queries";
import { MaintenanceStatusBadge } from "@/features/maintenance/components/maintenance-status-badge";
import { listRequests, type StatusFilter } from "@/features/maintenance/queries";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  isCategory,
  isMaintenanceStatus,
} from "@/features/maintenance/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Maintenance" };

type Params = { status?: string; property?: string; category?: string; page?: string };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status: StatusFilter =
    params.status === "all" || isMaintenanceStatus(params.status) ? params.status : "open";
  const category = isCategory(params.category) ? params.category : null;
  const page = parsePage(params.page);

  const [properties, organization] = await Promise.all([listPropertyOptions(), getCurrentOrganization()]);
  const propertyId = properties.some((p) => p.id === params.property) ? params.property! : null;
  const { rows: requests, total } = await listRequests({ status, propertyId, category, page });

  /** The current filters with `changes` applied. Any filter change resets to page 1. */
  const href = (changes: Partial<Record<keyof Params, string | null>>) => {
    const next = { status: status === "open" ? null : status, property: propertyId, category, page: null, ...changes };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    const search = query.toString();
    return search ? `/maintenance?${search}` : "/maintenance";
  };

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Issues reported by your tenants."
        actions={
          <Button asChild>
            <Link href="/maintenance/new">
              <Plus aria-hidden /> New request
            </Link>
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3">
        <FilterChips
          label="Filter by status"
          chips={[
            { label: "Open", href: href({ status: null }), active: status === "open" },
            ...STATUSES.map((s) => ({ label: STATUS_LABELS[s], href: href({ status: s }), active: status === s })),
            { label: "All", href: href({ status: "all" }), active: status === "all" },
          ]}
        />
        {properties.length > 1 && (
          <FilterChips
            label="Filter by property"
            chips={[
              { label: "All properties", href: href({ property: null }), active: !propertyId },
              ...properties.map((p) => ({ label: p.name, href: href({ property: p.id }), active: propertyId === p.id })),
            ]}
          />
        )}
        <FilterChips
          label="Filter by category"
          chips={[
            { label: "All categories", href: href({ category: null }), active: !category },
            ...CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], href: href({ category: c }), active: category === c })),
          ]}
        />
      </div>

      {requests.length === 0 ? (
        status === "open" && !propertyId && !category ? (
          <EmptyState
            icon={Wrench}
            title="Nothing needs attention"
            description="When tenants report an issue, it will show up here."
          />
        ) : (
          <EmptyState icon={SearchX} title="No requests match" description="Try a different filter." />
        )
      ) : (
        <div className="grid gap-4">
          <ul className="grid grid-cols-1 gap-2">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/maintenance/${request.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{request.title}</span>
                      <MaintenanceStatusBadge status={request.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {CATEGORY_LABELS[request.category]} · {request.property_name} · Unit {request.unit_number}
                      {request.tenant_name && ` · ${request.tenant_name}`}
                    </p>
                    <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(request.created_at, organization?.timezone)}</span>
                      {request.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" aria-hidden /> {request.comment_count}
                          <span className="sr-only">comments</span>
                        </span>
                      )}
                      {request.photo_count > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" aria-hidden /> {request.photo_count}
                          <span className="sr-only">photos</span>
                        </span>
                      )}
                      {request.assigned_to && <span>Assigned: {request.assigned_to}</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => withPage(href({}), p)} />
        </div>
      )}
    </>
  );
}
