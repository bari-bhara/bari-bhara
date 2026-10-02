import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type UserRole = Enums["user_role"];
export type OrgMemberRole = Enums["org_member_role"];
export type UnitStatus = Enums["unit_status"];

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

/** The narrow view of the signed-in user that server code passes around. */
export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
};
