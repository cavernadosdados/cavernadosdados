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
      achievement_definitions: {
        Row: {
          code: string
          description: string
          icon: string
          metric: string
          sort_order: number
          target: number
          title: string
          tokens_reward: number
          xp_reward: number
        }
        Insert: {
          code: string
          description: string
          icon?: string
          metric: string
          sort_order?: number
          target: number
          title: string
          tokens_reward?: number
          xp_reward?: number
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          metric?: string
          sort_order?: number
          target?: number
          title?: string
          tokens_reward?: number
          xp_reward?: number
        }
        Relationships: []
      }
      achievements: {
        Row: {
          code: string
          id: string
          tokens_awarded: number
          unlocked_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          code: string
          id?: string
          tokens_awarded?: number
          unlocked_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          code?: string
          id?: string
          tokens_awarded?: number
          unlocked_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
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
          next_session_date: string | null
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
          next_session_date?: string | null
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
          next_session_date?: string | null
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
      chat_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string | null
          reported_user_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason?: string | null
          reported_user_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string | null
          reported_user_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      global_chat: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      mesa_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          table_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          table_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesa_chat_messages_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      mesa_chat_reads: {
        Row: {
          id: string
          last_read_at: string
          table_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          table_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          table_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesa_chat_reads_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          related_table_id: string | null
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          related_table_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          related_table_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_rewards: {
        Row: {
          created_at: string
          id: string
          step_key: string
          tokens_awarded: number
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          id?: string
          step_key: string
          tokens_awarded?: number
          user_id: string
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          id?: string
          step_key?: string
          tokens_awarded?: number
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          application_id: string | null
          commission_cents: number
          created_at: string
          currency: string
          escrow_at: string | null
          id: string
          master_id: string
          master_payout_cents: number
          payer_id: string
          provider: string | null
          provider_metadata: Json
          provider_payment_id: string | null
          refunded_at: string | null
          released_at: string | null
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          application_id?: string | null
          commission_cents: number
          created_at?: string
          currency?: string
          escrow_at?: string | null
          id?: string
          master_id: string
          master_payout_cents: number
          payer_id: string
          provider?: string | null
          provider_metadata?: Json
          provider_payment_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          application_id?: string | null
          commission_cents?: number
          created_at?: string
          currency?: string
          escrow_at?: string | null
          id?: string
          master_id?: string
          master_payout_cents?: number
          payer_id?: string
          provider?: string | null
          provider_metadata?: Json
          provider_payment_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "table_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      player_reports: {
        Row: {
          character_avatar_url: string | null
          character_name: string
          content: string
          created_at: string
          id: string
          player_id: string
          session_log_id: string
          updated_at: string
        }
        Insert: {
          character_avatar_url?: string | null
          character_name?: string
          content: string
          created_at?: string
          id?: string
          player_id: string
          session_log_id: string
          updated_at?: string
        }
        Update: {
          character_avatar_url?: string | null
          character_name?: string
          content?: string
          created_at?: string
          id?: string
          player_id?: string
          session_log_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_reports_session_log_id_fkey"
            columns: ["session_log_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
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
          onboarding_completed: boolean
          plays_in_person: boolean | null
          preferred_themes: string[] | null
          signup_bonus_claimed: boolean
          tokens_balance: number
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
          xp: number
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
          onboarding_completed?: boolean
          plays_in_person?: boolean | null
          preferred_themes?: string[] | null
          signup_bonus_claimed?: boolean
          tokens_balance?: number
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
          xp?: number
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
          onboarding_completed?: boolean
          plays_in_person?: boolean | null
          preferred_themes?: string[] | null
          signup_bonus_claimed?: boolean
          tokens_balance?: number
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          xp?: number
        }
        Relationships: []
      }
      report_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "player_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendance: {
        Row: {
          created_at: string
          id: string
          next_session_date: string
          note: string | null
          player_id: string
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_session_date: string
          note?: string | null
          player_id: string
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          next_session_date?: string
          note?: string | null
          player_id?: string
          status?: string
          table_id?: string
          updated_at?: string
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
      session_logs: {
        Row: {
          ai_epic_summary: string | null
          created_at: string
          id: string
          master_narrative: string | null
          pinned_report_id: string | null
          sent_to_discord: boolean
          session_date: string
          session_number: number
          table_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_epic_summary?: string | null
          created_at?: string
          id?: string
          master_narrative?: string | null
          pinned_report_id?: string | null
          sent_to_discord?: boolean
          session_date?: string
          session_number?: number
          table_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          ai_epic_summary?: string | null
          created_at?: string
          id?: string
          master_narrative?: string | null
          pinned_report_id?: string | null
          sent_to_discord?: boolean
          session_date?: string
          session_number?: number
          table_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pinned_report"
            columns: ["pinned_report_id"]
            isOneToOne: false
            referencedRelation: "player_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          slots_added: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          slots_added?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          slots_added?: number
          user_id?: string
        }
        Relationships: []
      }
      table_applications: {
        Row: {
          created_at: string
          id: string
          is_priority: boolean
          message: string | null
          player_id: string
          priority_at: string | null
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_priority?: boolean
          message?: string | null
          player_id: string
          priority_at?: string | null
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_priority?: boolean
          message?: string | null
          player_id?: string
          priority_at?: string | null
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
      table_boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          master_id: string
          table_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          master_id: string
          table_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          master_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_boosts_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_favorites: {
        Row: {
          created_at: string
          id: string
          table_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          table_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_favorites_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          commission_pct: number
          cover_url: string | null
          created_at: string
          description: string | null
          duration: string
          id: string
          master_id: string
          max_players: number
          platform: string
          price_cents: number
          status: string
          system: string
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          commission_pct?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration: string
          id?: string
          master_id: string
          max_players?: number
          platform: string
          price_cents?: number
          status?: string
          system: string
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          master_id?: string
          max_players?: number
          platform?: string
          price_cents?: number
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
      token_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          related_table_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          related_table_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          related_table_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_priority_to_application: {
        Args: { _application_id: string }
        Returns: boolean
      }
      boost_table: { Args: { _table_id: string }; Returns: string }
      buy_slot_boost: { Args: never; Returns: string }
      check_and_unlock_achievements: { Args: never; Returns: Json }
      claim_onboarding_reward: { Args: { _step_key: string }; Returns: Json }
      compute_achievement_metric: {
        Args: { _metric: string; _user: string }
        Returns: number
      }
      count_pending_applications: {
        Args: { _user_id: string }
        Returns: number
      }
      current_pending_slots: { Args: { _user_id: string }; Returns: number }
      get_achievements_progress: {
        Args: never
        Returns: {
          code: string
          current_value: number
          description: string
          icon: string
          metric: string
          sort_order: number
          target: number
          title: string
          tokens_reward: number
          unlocked: boolean
          unlocked_at: string
          xp_reward: number
        }[]
      }
      grant_tokens: {
        Args: {
          _amount: number
          _reason: string
          _related_table_id?: string
          _user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_table_participant: {
        Args: { _table_id: string; _user_id: string }
        Returns: boolean
      }
      spend_tokens: {
        Args: { _amount: number; _reason: string; _related_table_id?: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
      user_type: ["player", "master"],
    },
  },
} as const
