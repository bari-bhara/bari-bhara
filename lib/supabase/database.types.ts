
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "organization_members": {
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
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "org_member_role": "owner"|"manager","unit_status": "vacant"|"occupied"|"maintenance"|"inactive","user_role": "landlord"|"tenant"
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
            "org_member_role": ["owner", "manager"],"unit_status": ["vacant", "occupied", "maintenance", "inactive"],"user_role": ["landlord", "tenant"]
          }
        }
} as const
