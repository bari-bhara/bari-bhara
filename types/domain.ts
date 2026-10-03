import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type UserRole = Enums["user_role"];
export type OrgMemberRole = Enums["org_member_role"];

export type Profile = Tables["profiles"]["Row"];
export type Organization = Tables["organizations"]["Row"];
export type OrganizationMember = Tables["organization_members"]["Row"];

/** The narrow view of the signed-in user that server code passes around. */
export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
};
