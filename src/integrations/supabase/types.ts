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
      apporteur_blocks: {
        Row: {
          attachments: Json | null
          color_preset: string
          content: string
          content_type: string | null
          created_at: string
          hide_from_sidebar: boolean | null
          hide_title: boolean | null
          icon: string | null
          id: string
          is_single_section: boolean | null
          order: number
          parent_id: string | null
          show_summary: boolean | null
          show_title_in_menu: boolean | null
          show_title_on_card: boolean | null
          slug: string
          summary: string | null
          tips_type: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          color_preset?: string
          content?: string
          content_type?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_single_section?: boolean | null
          order?: number
          parent_id?: string | null
          show_summary?: boolean | null
          show_title_in_menu?: boolean | null
          show_title_on_card?: boolean | null
          slug: string
          summary?: string | null
          tips_type?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          color_preset?: string
          content?: string
          content_type?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_single_section?: boolean | null
          order?: number
          parent_id?: string | null
          show_summary?: boolean | null
          show_title_in_menu?: boolean | null
          show_title_on_card?: boolean | null
          slug?: string
          summary?: string | null
          tips_type?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          attachments: Json | null
          color_preset: string
          content: string
          content_type: string | null
          created_at: string
          hide_from_sidebar: boolean | null
          hide_title: boolean | null
          icon: string | null
          id: string
          order: number
          parent_id: string | null
          show_summary: boolean | null
          slug: string
          summary: string | null
          tips_type: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          color_preset?: string
          content?: string
          content_type?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          order?: number
          parent_id?: string | null
          show_summary?: boolean | null
          slug: string
          summary?: string | null
          tips_type?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          color_preset?: string
          content?: string
          content_type?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          order?: number
          parent_id?: string | null
          show_summary?: boolean | null
          slug?: string
          summary?: string | null
          tips_type?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color_preset: string
          created_at: string
          display_order: number
          icon: string
          id: string
          scope: string
          title: string
          updated_at: string
        }
        Insert: {
          color_preset?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          scope: string
          title: string
          updated_at?: string
        }
        Update: {
          color_preset?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_queries: {
        Row: {
          admin_notes: string | null
          answer: string | null
          context_found: string | null
          created_at: string | null
          id: string
          is_incomplete: boolean | null
          question: string
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_scores: Json | null
          status: string | null
          user_id: string | null
          user_pseudo: string | null
        }
        Insert: {
          admin_notes?: string | null
          answer?: string | null
          context_found?: string | null
          created_at?: string | null
          id?: string
          is_incomplete?: boolean | null
          question: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_scores?: Json | null
          status?: string | null
          user_id?: string | null
          user_pseudo?: string | null
        }
        Update: {
          admin_notes?: string | null
          answer?: string | null
          context_found?: string | null
          created_at?: string | null
          id?: string
          is_incomplete?: boolean | null
          question?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_scores?: Json | null
          status?: string | null
          user_id?: string | null
          user_pseudo?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          apporteur_block_id: string | null
          block_id: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          scope: string
          title: string
          updated_at: string
        }
        Insert: {
          apporteur_block_id?: string | null
          block_id?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          scope: string
          title: string
          updated_at?: string
        }
        Update: {
          apporteur_block_id?: string | null
          block_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_apporteur_block_id_fkey"
            columns: ["apporteur_block_id"]
            isOneToOne: false
            referencedRelation: "apporteur_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          block_id: string
          block_slug: string
          block_title: string
          category_slug: string
          created_at: string
          id: string
          scope: string
          user_id: string
        }
        Insert: {
          block_id: string
          block_slug: string
          block_title: string
          category_slug: string
          created_at?: string
          id?: string
          scope?: string
          user_id: string
        }
        Update: {
          block_id?: string
          block_slug?: string
          block_title?: string
          category_slug?: string
          created_at?: string
          id?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      guide_chunks: {
        Row: {
          block_id: string
          block_slug: string
          block_title: string
          block_type: string
          chunk_index: number
          chunk_text: string
          created_at: string | null
          embedding: Json
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          block_id: string
          block_slug: string
          block_title: string
          block_type: string
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          embedding: Json
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          block_id?: string
          block_slug?: string
          block_title?: string
          block_type?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          embedding?: Json
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      home_cards: {
        Row: {
          color_preset: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          link: string
          title: string
          updated_at: string
        }
        Insert: {
          color_preset?: string
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          link: string
          title: string
          updated_at?: string
        }
        Update: {
          color_preset?: string
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          link?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agence: string | null
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean | null
          pseudo: string | null
          role_agence: string | null
          updated_at: string
        }
        Insert: {
          agence?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean | null
          pseudo?: string | null
          role_agence?: string | null
          updated_at?: string
        }
        Update: {
          agence?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean | null
          pseudo?: string | null
          role_agence?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          block_id: string
          can_access: boolean
          created_at: string | null
          id: string
          role_agence: string
          updated_at: string | null
        }
        Insert: {
          block_id: string
          can_access?: boolean
          created_at?: string | null
          id?: string
          role_agence: string
          updated_at?: string | null
        }
        Update: {
          block_id?: string
          can_access?: boolean
          created_at?: string | null
          id?: string
          role_agence?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          category_id: string
          content: Json
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_history: {
        Row: {
          block_id: string
          block_slug: string
          block_title: string
          category_slug: string
          id: string
          scope: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          block_id: string
          block_slug: string
          block_title: string
          category_slug: string
          id?: string
          scope?: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          block_id?: string
          block_slug?: string
          block_title?: string
          category_slug?: string
          id?: string
          scope?: string
          user_id?: string
          visited_at?: string | null
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
      user_widget_preferences: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_enabled: boolean
          size: string
          updated_at: string | null
          user_id: string
          widget_key: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          size?: string
          updated_at?: string | null
          user_id: string
          widget_key: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          size?: string
          updated_at?: string | null
          user_id?: string
          widget_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_from_pseudo: { Args: { _pseudo: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
