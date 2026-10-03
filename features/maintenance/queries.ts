import "server-only";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { pageRange, type Paged } from "@/lib/pagination";
import { id as idSchema } from "@/lib/zod-fields";
import type {
  MaintenanceCategory,
  MaintenanceOverview,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceUpdate,
} from "@/types/domain";
import { OPEN_STATUSES } from "./schema";

/**
 * Maintenance reads. Landlords read through maintenance_overview; tenants read
 * their own requests directly (no landlord-only columns; ADR 0007). RLS hides
 * internal notes from tenants. Call from inside a <Suspense> boundary.
 */

export const PHOTO_BUCKET = "maintenance-photos";
const SIGNED_URL_SECONDS = 60 * 60;

export type StatusFilter = MaintenanceStatus | "open" | "all";

export type RequestListItem = Pick<
  MaintenanceOverview,
  | "id"
  | "title"
  | "status"
  | "category"
  | "created_at"
  | "property_name"
  | "unit_number"
  | "tenant_name"
  | "assigned_to"
  | "comment_count"
  | "photo_count"
>;

/** A page of requests, newest first. Without descriptions, which the list doesn't show. */
export async function listRequests({
  status = "open",
  propertyId,
  category,
  page = 1,
}: {
  status?: StatusFilter;
  propertyId?: string | null;
  category?: MaintenanceCategory | null;
  page?: number;
}): Promise<Paged<RequestListItem>> {
  await requireRole("landlord");
  const supabase = await createClient();

  let query = supabase
    .from("maintenance_overview")
    .select(
      "id, title, status, category, created_at, property_name, unit_number, tenant_name, assigned_to, comment_count, photo_count",
      { count: "exact" },
    );
  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status !== "all") query = query.eq("status", status);
  if (propertyId && idSchema.safeParse(propertyId).success) query = query.eq("property_id", propertyId);
  if (category) query = query.eq("category", category);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load requests: ${error.message}`);
  return { rows: data as RequestListItem[], total: count ?? 0 };
}

export type Photo = { id: string; url: string };

export type Thread = {
  updates: MaintenanceUpdate[];
  photos: Photo[];
};

/** Updates (oldest first) and photos with short-lived signed URLs. */
async function loadThread(requestId: string): Promise<Thread> {
  const supabase = await createClient();
  const [updatesResult, photosResult] = await Promise.all([
    supabase
      .from("maintenance_updates")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at"),
    supabase
      .from("maintenance_photos")
      .select("id, storage_path")
      .eq("request_id", requestId)
      .order("created_at"),
  ]);
  if (updatesResult.error) throw new Error(`Failed to load updates: ${updatesResult.error.message}`);
  if (photosResult.error) throw new Error(`Failed to load photos: ${photosResult.error.message}`);

  let photos: Photo[] = [];
  if (photosResult.data.length > 0) {
    const { data: signed, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        photosResult.data.map((p) => p.storage_path),
        SIGNED_URL_SECONDS,
      );
    if (error) {
      console.error("Signing photo URLs failed", error);
    } else {
      photos = photosResult.data.flatMap((photo, i) =>
        signed[i]?.signedUrl ? [{ id: photo.id, url: signed[i].signedUrl }] : [],
      );
    }
  }
  return { updates: updatesResult.data, photos };
}

export type LandlordRequestDetail = MaintenanceOverview &
  Thread & {
    /** The tenant's login, to label their comments. */
    tenantUserId: string | null;
  };

/** Returns null for malformed ids and for requests outside the caller's org. */
export async function getRequestForLandlord(id: string): Promise<LandlordRequestDetail | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("maintenance_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load request: ${error.message}`);
  if (!request) return null;

  const [thread, tenantResult] = await Promise.all([
    loadThread(id),
    request.tenant_id
      ? supabase.from("tenants").select("user_id").eq("id", request.tenant_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (tenantResult.error) throw new Error(`Failed to load tenant: ${tenantResult.error.message}`);

  return {
    ...(request as MaintenanceOverview),
    ...thread,
    tenantUserId: tenantResult.data?.user_id ?? null,
  };
}

export type TenantRequest = MaintenanceRequest & { home: string };

export type TenantRequestListItem = Pick<MaintenanceRequest, "id" | "title" | "status" | "category" | "created_at">;

/** A page of the tenant's own requests, newest first. */
export async function listMyRequests(page = 1): Promise<Paged<TenantRequestListItem>> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("maintenance_requests")
    .select("id, title, status, category, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load your requests: ${error.message}`);
  return { rows: data, total: count ?? 0 };
}

export type TenantRequestDetail = TenantRequest & Thread;

export async function getMyRequest(id: string): Promise<TenantRequestDetail | null> {
  await requireRole("tenant");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const [{ data, error }, tenancies] = await Promise.all([
    supabase.from("maintenance_requests").select("*").eq("id", id).maybeSingle(),
    getMyTenancies(),
  ]);
  if (error) throw new Error(`Failed to load request: ${error.message}`);
  if (!data) return null;

  const tenancy = tenancies.find((t) => t.unit_id === data.unit_id);
  const thread = await loadThread(id);
  return {
    ...data,
    home: tenancy ? `${tenancy.property_name} · Unit ${tenancy.unit_number}` : "",
    ...thread,
  };
}

/** Units for the landlord's "raise an issue" form, labelled "Property · Unit". */
export async function listUnitOptions(): Promise<{ id: string; label: string }[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_number, property:properties!inner(name, archived_at)")
    .is("property.archived_at", null);
  if (error) throw new Error(`Failed to load units: ${error.message}`);

  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  return data
    .map((u) => ({ id: u.id, label: `${u.property.name} · Unit ${u.unit_number}` }))
    .sort((a, b) => collator.compare(a.label, b.label));
}
