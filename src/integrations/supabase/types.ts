export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_details: {
        Row: {
          absence_policy: string | null
          campaign_objectives: string | null
          combat_rules: string | null
          created_at: string
          discord_webhook_url: string | null
          frequency: string | null
          house_rules: string | null
          id: string
          lateness_policy: string | null
          progression_expectation: string | null
          pvp_rules: string | null
          restricted_classes: string | null
          restricted_races: string | null
          restricted_spells: string | null
          safety_lines: string | null
          safety_veils: string | null
          schedule_time: string | null
          table_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          absence_policy?: string | null
          campaign_objectives?: string | null
          combat_rules?: string | null
          created_at?: string
          discord_webhook_url?: string | null
          frequency?: string | null
          house_rules?: string | null
          id?: string
          lateness_policy?: string | null
          progression_expectation?: string | null
          pvp_rules?: string | null
          restricted_classes?: string | null
          restricted_races?: string | null
          restricted_spells?: string | null
          safety_lines?: string | null
          safety_veils?: string | null
          schedule_time?: string | null
          table_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          absence_policy?: string | null
          campaign_objectives?: string | null
          combat_rules?: string | null
          created_at?: string
          discord_webhook_url?: string | null
          frequency?: string | null
          house_rules?: string | null
          id?: string
          lateness_policy?: string | null
          progression_expectation?: string | null
          pvp_rules?: string | null
          restricted_classes?: string | null
          restricted_races?: string | null
          restricted_spells?: string | null
          safety_lines?: string | null
          safety_veils?: string | null
          schedule_time?: string | null
          table_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_details_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_tables_count: number | null
          apps_used: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          discord_link: string | null
          display_name: string | null
          experience_years: number | null
          id: string
          master_systems: string[] | null
          plays_in_person: boolean | null
          preferred_themes: string[] | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          active_tables_count?: number | null
          apps_used?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_link?: string | null
          display_name?: string | null
          experience_years?: number | null
          id: string
          master_systems?: string[] | null
          plays_in_person?: boolean | null
          preferred_themes?: string[] | null
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          active_tables_count?: number | null
          apps_used?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_link?: string | null
          display_name?: string | null
          experience_years?: number | null
          id?: string
          master_systems?: string[] | null
          plays_in_person?: boolean | null
          preferred_themes?: string[] | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      session_feedback: {
        Row: {
          comment: string | null
          compliments: string[] | null
          created_at: string
          id: string
          rating_1: number
          rating_2: number
          rating_3: number
          reviewed_id: string
          reviewer_id: string
          reviewer_role: string
          session_number: number
          table_id: string
        }
        Insert: {
          comment?: string | null
          compliments?: string[] | null
          created_at?: string
          id?: string
          rating_1?: number
          rating_2?: number
          rating_3?: number
          reviewed_id: string
          reviewer_id: string
          reviewer_role?: string
          session_number?: number
          table_id: string
        }
        Update: {
          comment?: string | null
          compliments?: string[] | null
          created_at?: string
          id?: string
          rating_1?: number
          rating_2?: number
          rating_3?: number
          reviewed_id?: string
          reviewer_id?: string
          reviewer_role?: string
          session_number?: number
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_applications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          player_id: string
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          player_id: string
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          player_id?: string
          status?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_applications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_applications_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          description: string | null
          duration: string
          id: string
          master_id: string
          max_players: number
          platform: string
          status: string
          system: string
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration: string
          id?: string
          master_id: string
          max_players?: number
          platform: string
          status?: string
          system: string
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          master_id?: string
          max_players?: number
          platform?: string
          status?: string
          system?: string
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_type: "player" | "master"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_type: ["player", "master"],
    },
  },
} as const
