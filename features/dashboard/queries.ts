import "server-only";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { EffectiveStatus, MaintenanceStatus } from "@/types/domain";

/**
 * Dashboard data: one RPC call each (see the Phase 7 migration). The shapes
 * below mirror the jsonb the functions build. Numeric values arrive as JSON
 * numbers. Call from inside a <Suspense> boundary.
 */

export type ActivityEntry = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
  /** Who or what it's about: a tenant name, a request or notice title. */
  subject: string | null;
  /** "Property · Unit" where relevant. */
  place: string | null;
};

export type LandlordDashboard = {
  today: string;
  month: string;
  properties: number;
  units: { total: number; occupied: number; vacant: number; maintenance: number; inactive: number };
  current_tenants: number;
  month_billed: number;
  month_collected: number;
  outstanding: number;
  overdue: { amount: number; count: number };
  overdue_tenants: {
    tenant_id: string;
    full_name: string;
    property_name: string;
    unit_number: string;
    amount: number;
    charges: number;
    oldest_due: string;
  }[];
  vacant_units: { unit_id: string; unit_number: string; property_name: string; default_rent: number }[];
  maintenance: { open: number; pending: number };
  open_requests: {
    id: string;
    title: string;
    status: MaintenanceStatus;
    created_at: string;
    unit_number: string;
    property_name: string;
  }[];
  live_notices: number;
  activity: ActivityEntry[];
};

export async function getLandlordDashboard(): Promise<LandlordDashboard | null> {
  await requireRole("landlord");
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("landlord_dashboard", { p_org_id: organization.id });
  if (error) throw new Error(`Failed to load dashboard: ${error.message}`);
  return data as unknown as LandlordDashboard | null;
}

export type TenantDashboard = {
  owed: number;
  overdue: number;
  next_due: {
    id: string;
    type_label: string;
    billing_month: string;
    outstanding: number;
    due_date: string;
    effective_status: EffectiveStatus;
  } | null;
  last_payment: { amount: number; paid_on: string } | null;
  open_requests: number;
  unread_notices: number;
};

export async function getTenantDashboard(): Promise<TenantDashboard> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tenant_dashboard");
  if (error) throw new Error(`Failed to load dashboard: ${error.message}`);
  return data as unknown as TenantDashboard;
}
