import { Plus, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchForm } from "@/components/app/search-form";
import { Button } from "@/components/ui/button";
import { listPropertyOptions } from "@/features/properties/queries";
import { TenantsList } from "@/features/tenants/components/tenants-list";
import { TENANTS_PAGE_SIZE, listTenants } from "@/features/tenants/queries";
import {
  TENANT_LIST_SORTS,
  TENANT_LIST_STATUSES,
  type TenantListSort,
  type TenantListStatus,
} from "@/features/tenants/schema";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "Tenants" };

const STATUS_LABELS: Record<TenantListStatus, string> = {
  current: "Current",
  past: "Past",
  all: "All",
};

type Params = { q?: string; status?: string; property?: string; sort?: string; page?: string };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = (TENANT_LIST_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as TenantListStatus)
    : "current";
  const sort = params.sort && params.sort in TENANT_LIST_SORTS ? (params.sort as TenantListSort) : "name";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [properties, organization] = await Promise.all([
    listPropertyOptions(),
    getCurrentOrganization(),
  ]);
  const propertyId = properties.some((p) => p.id === params.property) ? params.property! : null;
  const { tenants, total } = await listTenants({ q, status, propertyId, sort, page });

  /** The current filters with `changes` applied. Any filter change resets to page 1. */
  const href = (changes: Partial<Record<keyof Params, string | null>>) => {
    const next: Record<string, string | null> = {
      q: q || null,
      status: status === "current" ? null : status,
      property: propertyId,
      sort: sort === "name" ? null : sort,
      page: null,
      ...changes,
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    const search = query.toString();
    return search ? `/tenants?${search}` : "/tenants";
  };

  const keepForSearch: Record<string, string> = {};
  if (status !== "current") keepForSearch.status = status;
  if (propertyId) keepForSearch.property = propertyId;
  if (sort !== "name") keepForSearch.sort = sort;

  const narrowed = q !== "" || status === "past" || propertyId !== null;

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Everyone renting from you, current and past."
        actions={
          <Button asChild>
            <Link href="/tenants/new">
              <Plus aria-hidden /> Add tenant
            </Link>
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3">
        <SearchForm
          action="/tenants"
          label="Search tenants"
          placeholder="Search name, phone or email"
          defaultValue={q}
          params={keepForSearch}
        />
        <FilterChips
          label="Filter by status"
          chips={TENANT_LIST_STATUSES.map((s) => ({
            label: STATUS_LABELS[s],
            href: href({ status: s === "current" ? null : s }),
            active: status === s,
          }))}
        />
        {properties.length > 1 && (
          <FilterChips
            label="Filter by property"
            chips={[
              { label: "All properties", href: href({ property: null }), active: !propertyId },
              ...properties.map((property) => ({
                label: property.name,
                href: href({ property: property.id }),
                active: propertyId === property.id,
              })),
            ]}
          />
        )}
        <FilterChips
          label="Sort by"
          chips={(Object.keys(TENANT_LIST_SORTS) as TenantListSort[]).map((s) => ({
            label: TENANT_LIST_SORTS[s],
            href: href({ sort: s === "name" ? null : s }),
            active: sort === s,
          }))}
        />
      </div>

      {tenants.length === 0 ? (
        narrowed ? (
          <EmptyState
            icon={SearchX}
            title="No tenants match"
            description={q ? `Nobody matches "${q}" with these filters.` : "Try a different filter."}
            action={
              <Button asChild variant="outline">
                <Link href="/tenants?status=all">Show all tenants</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={status === "all" ? "No tenants yet" : "No current tenants"}
            description="Add a tenant and move them into one of your vacant units."
            action={
              <Button asChild>
                <Link href="/tenants/new">
                  <Plus aria-hidden /> Add tenant
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <TenantsList tenants={tenants} currency={organization?.currency ?? "BDT"} />
          <Pagination
            page={page}
            pageSize={TENANTS_PAGE_SIZE}
            total={total}
            href={(p) => {
              const base = href({});
              return p === 1 ? base : `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
            }}
          />
        </div>
      )}
    </>
  );
}
