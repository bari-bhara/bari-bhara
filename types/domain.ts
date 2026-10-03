import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type UserRole = Enums["user_role"];
export type OrgMemberRole = Enums["org_member_role"];
export type UnitStatus = Enums["unit_status"];
export type TenancyStatus = Enums["tenancy_status"];
export type ChargeCategory = Enums["charge_category"];
export type ChargeStatus = Enums["charge_status"];
export type PaymentMethod = Enums["payment_method"];
export type MaintenanceCategory = Enums["maintenance_category"];
export type MaintenanceStatus = Enums["maintenance_status"];
export type NoticeAudience = Enums["notice_audience"];
/** A charge's stored status, or "overdue" (derived in charge_balances; ADR 0004). */
export type EffectiveStatus = ChargeStatus | "overdue";

export type Profile = Tables["profiles"]["Row"];
export type Organization = Tables["organizations"]["Row"];
export type OrganizationMember = Tables["organization_members"]["Row"];
export type Property = Tables["properties"]["Row"];
export type Unit = Tables["units"]["Row"];
type PropertyOverviewRow = Database["public"]["Views"]["property_overview"]["Row"];
/** View columns are nullable in generated types; only archived_at really is. */
export type PropertyOverview = {
  [K in Exclude<keyof PropertyOverviewRow, "archived_at">]-?: NonNullable<PropertyOverviewRow[K]>;
} & { archived_at: string | null };

export type Tenant = Tables["tenants"]["Row"];
export type Tenancy = Tables["tenancies"]["Row"];
type TenantOverviewRow = Database["public"]["Views"]["tenant_overview"]["Row"];
/** A tenant with their current (or latest) tenancy; the tenancy columns are null if they have none. */
export type TenantOverview = {
  [K in "id" | "org_id" | "full_name" | "phone" | "email" | "has_login" | "created_at"]-?: NonNullable<
    TenantOverviewRow[K]
  >;
} & Omit<TenantOverviewRow, "id" | "org_id" | "full_name" | "phone" | "email" | "has_login" | "created_at">;
/** A row of my_tenancies(): what a tenant may see about their home (ADR 0007). */
export type MyTenancy = Database["public"]["Functions"]["my_tenancies"]["Returns"][number];

export type Payment = Tables["payments"]["Row"];
export type ChargeType = Tables["charge_types"]["Row"];

type Views = Database["public"]["Views"];
/** View columns come back nullable in generated types; these never are. */
type Required<T, Nullable extends keyof T = never> = {
  [K in Exclude<keyof T, Nullable>]-?: NonNullable<T[K]>;
} & { [K in Nullable]: T[K] };

type ChargeBalanceNullable = "voided_at";
export type ChargeBalance = Omit<
  Required<Views["charge_balances"]["Row"], ChargeBalanceNullable>,
  "effective_status"
> & { effective_status: EffectiveStatus };
export type ChargeOverview = Omit<
  Required<Views["charge_overview"]["Row"], ChargeBalanceNullable>,
  "effective_status"
> & { effective_status: EffectiveStatus };
export type PaymentOverview = Required<Views["payment_overview"]["Row"], "voided_at">;

export type MaintenanceRequest = Tables["maintenance_requests"]["Row"];
export type MaintenanceUpdate = Tables["maintenance_updates"]["Row"];
export type MaintenanceOverview = Required<
  Views["maintenance_overview"]["Row"],
  "tenancy_id" | "tenant_id" | "created_by" | "resolved_at" | "tenant_name"
>;

export type MyNotice = Required<Views["my_notices"]["Row"], "expires_at">;
export type NoticeOverview = Required<
  Views["notice_overview"]["Row"],
  "property_id" | "expires_at" | "created_by" | "property_name"
>;

/** The narrow view of the signed-in user that server code passes around. */
export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
};
