
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"org_id": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"org_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"org_id": string,"role": Database["public"]['Enums']["org_member_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"org_id": string,"role"?: Database["public"]['Enums']["org_member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["org_member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"name": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"id": string,"phone"?: string | null,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "address": string,"archived_at": string | null,"city": string,"created_at": string,"id": string,"name": string,"notes": string,"org_id": string,"rent_due_day": number,"updated_at": string
                  }
                  Insert: {
                    "address"?: string,"archived_at"?: string | null,"city"?: string,"created_at"?: string,"id"?: string,"name": string,"notes"?: string,"org_id": string,"rent_due_day"?: number,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"archived_at"?: string | null,"city"?: string,"created_at"?: string,"id"?: string,"name"?: string,"notes"?: string,"org_id"?: string,"rent_due_day"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"tenancies": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"monthly_rent": number,"move_in_date": string,"move_out_date": string | null,"move_out_notes": string,"move_out_reason": string,"org_id": string,"security_deposit": number,"status": Database["public"]['Enums']["tenancy_status"],"tenant_id": string,"unit_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"monthly_rent": number,"move_in_date": string,"move_out_date"?: string | null,"move_out_notes"?: string,"move_out_reason"?: string,"org_id": string,"security_deposit"?: number,"status"?: Database["public"]['Enums']["tenancy_status"],"tenant_id": string,"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"monthly_rent"?: number,"move_in_date"?: string,"move_out_date"?: string | null,"move_out_notes"?: string,"move_out_reason"?: string,"org_id"?: string,"security_deposit"?: number,"status"?: Database["public"]['Enums']["tenancy_status"],"tenant_id"?: string,"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenancies_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "tenant_overview"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "tenancies_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "tenancies_org_id_unit_id_fkey"
      columns: ["org_id","unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"tenant_invites": {
                  Row: {
                    "code_hash": string,"created_at": string,"created_by": string | null,"expires_at": string,"id": string,"org_id": string,"tenant_id": string,"used_at": string | null,"used_by": string | null
                  }
                  Insert: {
                    "code_hash": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"org_id": string,"tenant_id": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"org_id"?: string,"tenant_id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_invites_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "tenant_overview"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "tenant_invites_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"notes": string,"org_id": string,"phone": string,"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string,"full_name": string,"id"?: string,"notes"?: string,"org_id": string,"phone"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"notes"?: string,"org_id"?: string,"phone"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "bedrooms": number | null,"created_at": string,"default_rent": number,"floor": string,"id": string,"notes": string,"org_id": string,"property_id": string,"status": Database["public"]['Enums']["unit_status"],"unit_number": string,"unit_type": string,"updated_at": string
                  }
                  Insert: {
                    "bedrooms"?: number | null,"created_at"?: string,"default_rent"?: number,"floor"?: string,"id"?: string,"notes"?: string,"org_id": string,"property_id": string,"status"?: Database["public"]['Enums']["unit_status"],"unit_number": string,"unit_type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "bedrooms"?: number | null,"created_at"?: string,"default_rent"?: number,"floor"?: string,"id"?: string,"notes"?: string,"org_id"?: string,"property_id"?: string,"status"?: Database["public"]['Enums']["unit_status"],"unit_number"?: string,"unit_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_org_id_property_id_fkey"
      columns: ["org_id","property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "units_org_id_property_id_fkey"
      columns: ["org_id","property_id"]
isOneToOne: false
      referencedRelation: "property_overview"
      referencedColumns: ["org_id","id"]
    }
                  ]
                }
          }
          Views: {
            "property_overview": {
                  Row: {
                    "address": string | null,"archived_at": string | null,"city": string | null,"created_at": string | null,"id": string | null,"name": string | null,"occupied_count": number | null,"org_id": string | null,"rent_due_day": number | null,"unit_count": number | null,"vacant_count": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_overview": {
                  Row: {
                    "created_at": string | null,"email": string | null,"full_name": string | null,"has_login": boolean | null,"id": string | null,"monthly_rent": number | null,"move_in_date": string | null,"move_out_date": string | null,"org_id": string | null,"phone": string | null,"property_id": string | null,"property_name": string | null,"tenancy_id": string | null,"tenancy_status": Database["public"]['Enums']["tenancy_status"] | null,"unit_id": string | null,"unit_number": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_tenant":
{ Args: { "p_email": string,"p_full_name": string,"p_monthly_rent": number,"p_move_in_date": string,"p_notes": string,"p_phone": string,"p_security_deposit": number,"p_unit_id": string }; Returns: string
                           },
"claim_tenant_invite":
{ Args: { "p_code": string }; Returns: string
                           },
"create_tenant_invite":
{ Args: { "p_tenant_id": string }; Returns: {
              "invite_code": string,"invite_expires_at": string
            }[]
                           },
"my_tenancies":
{ Args: Record<PropertyKey, never>; Returns: {
              "bedrooms": number,"currency": string,"floor": string,"monthly_rent": number,"move_in_date": string,"move_out_date": string,"organization_name": string,"property_address": string,"property_city": string,"property_name": string,"rent_due_day": number,"security_deposit": number,"status": Database["public"]['Enums']["tenancy_status"],"tenancy_id": string,"timezone": string,"unit_id": string,"unit_number": string,"unit_type": string
            }[]
                           }
          }
          Enums: {
            "org_member_role": "owner"|"manager","tenancy_status": "active"|"moved_out","unit_status": "vacant"|"occupied"|"maintenance"|"inactive","user_role": "landlord"|"tenant"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "org_member_role": ["owner", "manager"],"tenancy_status": ["active", "moved_out"],"unit_status": ["vacant", "occupied", "maintenance", "inactive"],"user_role": ["landlord", "tenant"]
          }
        }
} as const
