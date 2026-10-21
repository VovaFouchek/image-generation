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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      generation_batches: {
        Row: {
          brief: Json
          created_at: string
          created_by: string
          id: string
          kind: string
          request: Json
          source_batch_id: string | null
          tenant_id: string
        }
        Insert: {
          brief: Json
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          request: Json
          source_batch_id?: string | null
          tenant_id: string
        }
        Update: {
          brief?: Json
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          request?: Json
          source_batch_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_batches_source_batch_id_tenant_id_fkey"
            columns: ["source_batch_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "generation_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_items: {
        Row: {
          attempts: number
          batch_id: string
          config: Json
          created_at: string
          duration_ms: number | null
          error: Json | null
          id: string
          index: number
          mime_type: string | null
          model: string | null
          prompt: Json
          provider_request_id: string | null
          running_since: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          updated_at: string
          usage: Json | null
          variation: Json
        }
        Insert: {
          attempts?: number
          batch_id: string
          config: Json
          created_at?: string
          duration_ms?: number | null
          error?: Json | null
          id?: string
          index: number
          mime_type?: string | null
          model?: string | null
          prompt: Json
          provider_request_id?: string | null
          running_since?: string | null
          status?: string
          storage_path?: string | null
          tenant_id: string
          updated_at?: string
          usage?: Json | null
          variation: Json
        }
        Update: {
          attempts?: number
          batch_id?: string
          config?: Json
          created_at?: string
          duration_ms?: number | null
          error?: Json | null
          id?: string
          index?: number
          mime_type?: string | null
          model?: string | null
          prompt?: Json
          provider_request_id?: string | null
          running_since?: string | null
          status?: string
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string
          usage?: Json | null
          variation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generation_items_batch_id_tenant_id_fkey"
            columns: ["batch_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      knowledge_versions: {
        Row: {
          content: Json
          created_at: string
          id: number
          tenant_id: string | null
          version: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: never
          tenant_id?: string | null
          version: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: never
          tenant_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_generation_item: {
        Args: { p_batch_id: string; p_item_id: string }
        Returns: {
          attempts: number
          batch_id: string
          config: Json
          created_at: string
          duration_ms: number | null
          error: Json | null
          id: string
          index: number
          mime_type: string | null
          model: string | null
          prompt: Json
          provider_request_id: string | null
          running_since: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          updated_at: string
          usage: Json | null
          variation: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "generation_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_generation_batch: {
        Args: {
          p_brief: Json
          p_items: Json
          p_kind: string
          p_request: Json
          p_source_batch_id?: string
          p_tenant_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
