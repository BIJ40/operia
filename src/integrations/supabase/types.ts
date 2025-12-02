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
      agency_collaborators: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          is_registered_user: boolean
          last_name: string
          notes: string | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_registered_user?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_registered_user?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_collaborators_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_collaborators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_royalty_calculations: {
        Row: {
          agency_id: string
          ca_cumul_annuel: number
          calculated_at: string
          calculated_by: string | null
          config_id: string
          detail_tranches: Json
          id: string
          month: number
          redevance_calculee: number
          year: number
        }
        Insert: {
          agency_id: string
          ca_cumul_annuel: number
          calculated_at?: string
          calculated_by?: string | null
          config_id: string
          detail_tranches?: Json
          id?: string
          month: number
          redevance_calculee: number
          year: number
        }
        Update: {
          agency_id?: string
          ca_cumul_annuel?: number
          calculated_at?: string
          calculated_by?: string | null
          config_id?: string
          detail_tranches?: Json
          id?: string
          month?: number
          redevance_calculee?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_royalty_calculations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_royalty_calculations_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "agency_royalty_config"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_royalty_config: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_active: boolean
          model_name: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_name?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_name?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_royalty_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_royalty_tiers: {
        Row: {
          config_id: string
          created_at: string
          from_amount: number
          id: string
          percentage: number
          tier_order: number
          to_amount: number | null
        }
        Insert: {
          config_id: string
          created_at?: string
          from_amount: number
          id?: string
          percentage: number
          tier_order: number
          to_amount?: number | null
        }
        Update: {
          config_id?: string
          created_at?: string
          from_amount?: number
          id?: string
          percentage?: number
          tier_order?: number
          to_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_royalty_tiers_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "agency_royalty_config"
            referencedColumns: ["id"]
          },
        ]
      }
      animator_visits: {
        Row: {
          agency_id: string
          animator_id: string
          created_at: string
          id: string
          notes: string | null
          report_content: string | null
          report_file_path: string | null
          status: string
          updated_at: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          agency_id: string
          animator_id: string
          created_at?: string
          id?: string
          notes?: string | null
          report_content?: string | null
          report_file_path?: string | null
          status?: string
          updated_at?: string
          visit_date: string
          visit_type?: string
        }
        Update: {
          agency_id?: string
          animator_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          report_content?: string | null
          report_file_path?: string | null
          status?: string
          updated_at?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "animator_visits_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animator_visits_animator_id_fkey"
            columns: ["animator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "priority_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_agencies: {
        Row: {
          adresse: string | null
          code_postal: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          date_cloture_bilan: string | null
          date_ouverture: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_cloture_bilan?: string | null
          date_ouverture?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_cloture_bilan?: string | null
          date_ouverture?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      apogee_guides: {
        Row: {
          categorie: string
          created_at: string | null
          id: string
          section: string
          tags: string | null
          texte: string
          titre: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          categorie: string
          created_at?: string | null
          id?: string
          section: string
          tags?: string | null
          texte: string
          titre: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string | null
          id?: string
          section?: string
          tags?: string | null
          texte?: string
          titre?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      apogee_impact_tags: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
      apogee_modules: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
      apogee_owner_sides: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
      apogee_priorities: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
      apogee_reported_by: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
      apogee_ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_ticket_comments: {
        Row: {
          author_name: string | null
          author_type: string
          body: string
          created_at: string
          created_by_user_id: string | null
          id: string
          is_internal: boolean | null
          source_field: string | null
          ticket_id: string
        }
        Insert: {
          author_name?: string | null
          author_type: string
          body: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_internal?: boolean | null
          source_field?: string | null
          ticket_id: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          body?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_internal?: boolean | null
          source_field?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_comments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_ticket_history: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_ticket_statuses: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_final: boolean
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id: string
          is_final?: boolean
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_final?: boolean
          label?: string
        }
        Relationships: []
      }
      apogee_ticket_transitions: {
        Row: {
          allowed_role: Database["public"]["Enums"]["apogee_ticket_role"]
          created_at: string
          from_status: string
          id: string
          to_status: string
        }
        Insert: {
          allowed_role: Database["public"]["Enums"]["apogee_ticket_role"]
          created_at?: string
          from_status: string
          id?: string
          to_status: string
        }
        Update: {
          allowed_role?: Database["public"]["Enums"]["apogee_ticket_role"]
          created_at?: string
          from_status?: string
          id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_transitions_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "apogee_ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_ticket_transitions_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "apogee_ticket_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_ticket_user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ticket_role: Database["public"]["Enums"]["apogee_ticket_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_role: Database["public"]["Enums"]["apogee_ticket_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_role?: Database["public"]["Enums"]["apogee_ticket_role"]
          user_id?: string
        }
        Relationships: []
      }
      apogee_ticket_views: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_views_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      apogee_tickets: {
        Row: {
          action_type: string | null
          created_at: string
          created_by_user_id: string | null
          created_from: string
          description: string | null
          element_concerne: string
          external_key: string | null
          h_max: number | null
          h_min: number | null
          hca_code: string | null
          heat_priority: number
          id: string
          impact_tags: string[] | null
          is_qualified: boolean | null
          kanban_status: string
          last_modified_at: string | null
          last_modified_by_user_id: string | null
          merged_into_ticket_id: string | null
          module: string | null
          module_area: string | null
          needs_completion: boolean | null
          notes_internes: string | null
          original_description: string | null
          original_title: string | null
          owner_side: string | null
          qualified_at: string | null
          qualified_by: string | null
          reported_by: string | null
          severity: string | null
          source_row_index: number | null
          source_sheet: string | null
          theme: string | null
          ticket_number: number
          ticket_type: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_from?: string
          description?: string | null
          element_concerne: string
          external_key?: string | null
          h_max?: number | null
          h_min?: number | null
          hca_code?: string | null
          heat_priority?: number
          id?: string
          impact_tags?: string[] | null
          is_qualified?: boolean | null
          kanban_status?: string
          last_modified_at?: string | null
          last_modified_by_user_id?: string | null
          merged_into_ticket_id?: string | null
          module?: string | null
          module_area?: string | null
          needs_completion?: boolean | null
          notes_internes?: string | null
          original_description?: string | null
          original_title?: string | null
          owner_side?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reported_by?: string | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          theme?: string | null
          ticket_number?: number
          ticket_type?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_from?: string
          description?: string | null
          element_concerne?: string
          external_key?: string | null
          h_max?: number | null
          h_min?: number | null
          hca_code?: string | null
          heat_priority?: number
          id?: string
          impact_tags?: string[] | null
          is_qualified?: boolean | null
          kanban_status?: string
          last_modified_at?: string | null
          last_modified_by_user_id?: string | null
          merged_into_ticket_id?: string | null
          module?: string | null
          module_area?: string | null
          needs_completion?: boolean | null
          notes_internes?: string | null
          original_description?: string | null
          original_title?: string | null
          owner_side?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reported_by?: string | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          theme?: string | null
          ticket_number?: number
          ticket_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_tickets_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_tickets_kanban_status_fkey"
            columns: ["kanban_status"]
            isOneToOne: false
            referencedRelation: "apogee_ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_tickets_merged_into_ticket_id_fkey"
            columns: ["merged_into_ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_tickets_module_fkey"
            columns: ["module"]
            isOneToOne: false
            referencedRelation: "apogee_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notification_settings: {
        Row: {
          email_enabled: boolean
          id: string
          sms_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      apporteur_blocks: {
        Row: {
          attachments: Json | null
          color_preset: string
          content: string
          content_type: string | null
          content_updated_at: string | null
          created_at: string
          hide_from_sidebar: boolean | null
          hide_title: boolean | null
          icon: string | null
          id: string
          is_empty: boolean | null
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
          content_updated_at?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_empty?: boolean | null
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
          content_updated_at?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_empty?: boolean | null
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
          completed_at: string | null
          content: string
          content_type: string | null
          content_updated_at: string | null
          created_at: string
          hide_from_sidebar: boolean | null
          hide_title: boolean | null
          icon: string | null
          id: string
          is_empty: boolean | null
          is_in_progress: boolean | null
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
          completed_at?: string | null
          content?: string
          content_type?: string | null
          content_updated_at?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_empty?: boolean | null
          is_in_progress?: boolean | null
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
          completed_at?: string | null
          content?: string
          content_type?: string | null
          content_updated_at?: string | null
          created_at?: string
          hide_from_sidebar?: boolean | null
          hide_title?: boolean | null
          icon?: string | null
          id?: string
          is_empty?: boolean | null
          is_in_progress?: boolean | null
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
          answer_quality: number | null
          answer_raw: string | null
          apporteur_code_used: string | null
          chat_context: string | null
          context_found: string | null
          context_type_used:
            | Database["public"]["Enums"]["rag_context_type"]
            | null
          created_at: string | null
          id: string
          improvement_block_id: string | null
          is_incomplete: boolean | null
          question: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_cible_used: string | null
          similarity_scores: Json | null
          source_block_ids: string[] | null
          status: string | null
          univers_code_used: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          answer?: string | null
          answer_quality?: number | null
          answer_raw?: string | null
          apporteur_code_used?: string | null
          chat_context?: string | null
          context_found?: string | null
          context_type_used?:
            | Database["public"]["Enums"]["rag_context_type"]
            | null
          created_at?: string | null
          id?: string
          improvement_block_id?: string | null
          is_incomplete?: boolean | null
          question: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_cible_used?: string | null
          similarity_scores?: Json | null
          source_block_ids?: string[] | null
          status?: string | null
          univers_code_used?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          answer?: string | null
          answer_quality?: number | null
          answer_raw?: string | null
          apporteur_code_used?: string | null
          chat_context?: string | null
          context_found?: string | null
          context_type_used?:
            | Database["public"]["Enums"]["rag_context_type"]
            | null
          created_at?: string | null
          id?: string
          improvement_block_id?: string | null
          is_incomplete?: boolean | null
          question?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_cible_used?: string | null
          similarity_scores?: Json | null
          source_block_ids?: string[] | null
          status?: string | null
          univers_code_used?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      diffusion_settings: {
        Row: {
          auto_rotation_enabled: boolean
          created_at: string
          enabled_slides: string[]
          id: string
          objectif_amount: number
          objectif_title: string
          rotation_speed_seconds: number
          saviez_vous_templates: string[]
          updated_at: string
        }
        Insert: {
          auto_rotation_enabled?: boolean
          created_at?: string
          enabled_slides?: string[]
          id?: string
          objectif_amount?: number
          objectif_title?: string
          rotation_speed_seconds?: number
          saviez_vous_templates?: string[]
          updated_at?: string
        }
        Update: {
          auto_rotation_enabled?: boolean
          created_at?: string
          enabled_slides?: string[]
          id?: string
          objectif_amount?: number
          objectif_title?: string
          rotation_speed_seconds?: number
          saviez_vous_templates?: string[]
          updated_at?: string
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
      expense_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approver_id: string | null
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          receipt_file_path: string | null
          rejection_reason: string | null
          requester_id: string
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approver_id?: string | null
          category?: string
          created_at?: string
          description: string
          expense_date: string
          id?: string
          receipt_file_path?: string | null
          rejection_reason?: string | null
          requester_id: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approver_id?: string | null
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_file_path?: string | null
          rejection_reason?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "animator_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          apporteur_code: string | null
          category_id: string | null
          context_type: Database["public"]["Enums"]["rag_context_type"]
          created_at: string
          created_from_query_id: string | null
          display_order: number
          id: string
          is_published: boolean
          linked_block_ids: string[] | null
          question: string
          role_cible: string | null
          univers_code: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          apporteur_code?: string | null
          category_id?: string | null
          context_type?: Database["public"]["Enums"]["rag_context_type"]
          created_at?: string
          created_from_query_id?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          linked_block_ids?: string[] | null
          question: string
          role_cible?: string | null
          univers_code?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          apporteur_code?: string | null
          category_id?: string | null
          context_type?: Database["public"]["Enums"]["rag_context_type"]
          created_at?: string
          created_from_query_id?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          linked_block_ids?: string[] | null
          question?: string
          role_cible?: string | null
          univers_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_items_created_from_query_id_fkey"
            columns: ["created_from_query_id"]
            isOneToOne: false
            referencedRelation: "chatbot_queries"
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
      franchiseur_agency_assignments: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchiseur_agency_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      franchiseur_roles: {
        Row: {
          created_at: string
          franchiseur_role: Database["public"]["Enums"]["franchiseur_role"]
          id: string
          permissions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          franchiseur_role: Database["public"]["Enums"]["franchiseur_role"]
          id?: string
          permissions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          franchiseur_role?: Database["public"]["Enums"]["franchiseur_role"]
          id?: string
          permissions?: Json | null
          updated_at?: string
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
          context_type: Database["public"]["Enums"]["rag_context_type"]
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
          context_type: Database["public"]["Enums"]["rag_context_type"]
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
          context_type?: Database["public"]["Enums"]["rag_context_type"]
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
          is_logo: boolean | null
          link: string
          size: string | null
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
          is_logo?: boolean | null
          link: string
          size?: string | null
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
          is_logo?: boolean | null
          link?: string
          size?: string | null
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
      page_metadata: {
        Row: {
          created_at: string
          header_icon_color: string | null
          header_icon_size: string | null
          header_subtitle: string | null
          header_subtitle_bg_color: string | null
          header_subtitle_text_size: string | null
          header_title: string | null
          header_title_size: string | null
          id: string
          menu_label: string | null
          page_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          header_icon_color?: string | null
          header_icon_size?: string | null
          header_subtitle?: string | null
          header_subtitle_bg_color?: string | null
          header_subtitle_text_size?: string | null
          header_title?: string | null
          header_title_size?: string | null
          id?: string
          menu_label?: string | null
          page_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          header_icon_color?: string | null
          header_icon_size?: string | null
          header_subtitle?: string | null
          header_subtitle_bg_color?: string | null
          header_subtitle_text_size?: string | null
          header_title?: string | null
          header_title_size?: string | null
          id?: string
          menu_label?: string | null
          page_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      planning_signatures: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          signed_at: string | null
          signed_by_user_id: string | null
          tech_id: number
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          signed_at?: string | null
          signed_by_user_id?: string | null
          tech_id: number
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          signed_at?: string | null
          signed_by_user_id?: string | null
          tech_id?: number
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      priority_announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          exclude_base_users: boolean | null
          expires_at: string
          id: string
          image_path: string | null
          is_active: boolean | null
          target_all: boolean | null
          target_global_roles: Json | null
          target_role_agences: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          exclude_base_users?: boolean | null
          expires_at: string
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          target_all?: boolean | null
          target_global_roles?: Json | null
          target_role_agences?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          exclude_base_users?: boolean | null
          expires_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          target_all?: boolean | null
          target_global_roles?: Json | null
          target_role_agences?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agence: string | null
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          enabled_modules: Json | null
          first_name: string | null
          global_role: Database["public"]["Enums"]["global_role"] | null
          id: string
          is_active: boolean | null
          last_name: string | null
          must_change_password: boolean | null
          phone: string | null
          role_agence: string | null
          updated_at: string
        }
        Insert: {
          agence?: string | null
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          enabled_modules?: Json | null
          first_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"] | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role_agence?: string | null
          updated_at?: string
        }
        Update: {
          agence?: string | null
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          enabled_modules?: Json | null
          first_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"] | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role_agence?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_index_documents: {
        Row: {
          apporteur_code: string | null
          chunk_count: number | null
          context_type: Database["public"]["Enums"]["rag_context_type"] | null
          created_at: string
          detected_context: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          filename: string
          id: string
          job_id: string
          processed_at: string | null
          role_cible: string | null
          status: string
          univers_code: string | null
          updated_at: string
        }
        Insert: {
          apporteur_code?: string | null
          chunk_count?: number | null
          context_type?: Database["public"]["Enums"]["rag_context_type"] | null
          created_at?: string
          detected_context?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          filename: string
          id?: string
          job_id: string
          processed_at?: string | null
          role_cible?: string | null
          status?: string
          univers_code?: string | null
          updated_at?: string
        }
        Update: {
          apporteur_code?: string | null
          chunk_count?: number | null
          context_type?: Database["public"]["Enums"]["rag_context_type"] | null
          created_at?: string
          detected_context?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          job_id?: string
          processed_at?: string | null
          role_cible?: string | null
          status?: string
          univers_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_index_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rag_index_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_index_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_count: number | null
          id: string
          metadata: Json | null
          processed_documents: number | null
          started_at: string | null
          status: string
          total_documents: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          id?: string
          metadata?: Json | null
          processed_documents?: number | null
          started_at?: string | null
          status?: string
          total_documents?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          id?: string
          metadata?: Json | null
          processed_documents?: number | null
          started_at?: string | null
          status?: string
          total_documents?: number | null
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
      storage_quota_alerts: {
        Row: {
          cache_keys: Json | null
          created_at: string
          id: string
          percentage_used: number
          quota_total_bytes: number
          quota_used_bytes: number
          user_agence: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          cache_keys?: Json | null
          created_at?: string
          id?: string
          percentage_used: number
          quota_total_bytes: number
          quota_used_bytes: number
          user_agence?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          cache_keys?: Json | null
          created_at?: string
          id?: string
          percentage_used?: number
          quota_total_bytes?: number
          quota_used_bytes?: number
          user_agence?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      support_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_from_support: boolean
          is_internal_note: boolean | null
          is_system_message: boolean | null
          message: string
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_support?: boolean
          is_internal_note?: boolean | null
          is_system_message?: boolean | null
          message: string
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_support?: boolean
          is_internal_note?: boolean | null
          is_system_message?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_presence: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          agency_slug: string | null
          ai_category: string | null
          ai_classified_at: string | null
          ai_confidence: number | null
          ai_is_incomplete: boolean | null
          ai_priority: string | null
          ai_suggested_answer: string | null
          ai_tags: string[] | null
          assigned_to: string | null
          auto_classified: boolean | null
          category: string | null
          chatbot_conversation: Json | null
          created_at: string
          due_at: string | null
          escalation_history: Json | null
          has_attachments: boolean
          heat_priority: number | null
          id: string
          priority: string | null
          rating: number | null
          rating_comment: string | null
          resolved_at: string | null
          service: string | null
          sla_status: string | null
          source: string
          status: string
          subject: string
          support_level: number | null
          type: string | null
          updated_at: string
          user_id: string
          viewed_by_support_at: string | null
        }
        Insert: {
          agency_slug?: string | null
          ai_category?: string | null
          ai_classified_at?: string | null
          ai_confidence?: number | null
          ai_is_incomplete?: boolean | null
          ai_priority?: string | null
          ai_suggested_answer?: string | null
          ai_tags?: string[] | null
          assigned_to?: string | null
          auto_classified?: boolean | null
          category?: string | null
          chatbot_conversation?: Json | null
          created_at?: string
          due_at?: string | null
          escalation_history?: Json | null
          has_attachments?: boolean
          heat_priority?: number | null
          id?: string
          priority?: string | null
          rating?: number | null
          rating_comment?: string | null
          resolved_at?: string | null
          service?: string | null
          sla_status?: string | null
          source?: string
          status?: string
          subject?: string
          support_level?: number | null
          type?: string | null
          updated_at?: string
          user_id: string
          viewed_by_support_at?: string | null
        }
        Update: {
          agency_slug?: string | null
          ai_category?: string | null
          ai_classified_at?: string | null
          ai_confidence?: number | null
          ai_is_incomplete?: boolean | null
          ai_priority?: string | null
          ai_suggested_answer?: string | null
          ai_tags?: string[] | null
          assigned_to?: string | null
          auto_classified?: boolean | null
          category?: string | null
          chatbot_conversation?: Json | null
          created_at?: string
          due_at?: string | null
          escalation_history?: Json | null
          has_attachments?: boolean
          heat_priority?: number | null
          id?: string
          priority?: string | null
          rating?: number | null
          rating_comment?: string | null
          resolved_at?: string | null
          service?: string | null
          sla_status?: string | null
          source?: string
          status?: string
          subject?: string
          support_level?: number | null
          type?: string | null
          updated_at?: string
          user_id?: string
          viewed_by_support_at?: string | null
        }
        Relationships: []
      }
      ticket_duplicate_suggestions: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          similarity: number
          status: string
          ticket_id_candidate: string
          ticket_id_source: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity: number
          status?: string
          ticket_id_candidate: string
          ticket_id_source: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity?: number
          status?: string
          ticket_id_candidate?: string
          ticket_id_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_duplicate_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_duplicate_suggestions_ticket_id_candidate_fkey"
            columns: ["ticket_id_candidate"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_duplicate_suggestions_ticket_id_source_fkey"
            columns: ["ticket_id_source"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_embeddings: {
        Row: {
          embedding: Json
          id: string
          text_hash: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          embedding: Json
          id?: string
          text_hash?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          embedding?: Json
          id?: string
          text_hash?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_embeddings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_actions_config: {
        Row: {
          created_at: string
          delai_a_facturer: number
          delai_devis_a_faire: number
          delai_relance_technicien: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delai_a_facturer?: number
          delai_devis_a_faire?: number
          delai_relance_technicien?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delai_a_facturer?: number
          delai_devis_a_faire?: number
          delai_relance_technicien?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          id: string
          is_connected: boolean
          provider: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          provider: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          provider?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_connection_logs: {
        Row: {
          connected_at: string
          created_at: string
          disconnected_at: string | null
          duration_seconds: number | null
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_creation_requests: {
        Row: {
          agency_id: string
          created_at: string
          email: string
          enabled_modules: Json | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_agence: string
          status: string
          target_global_role: Database["public"]["Enums"]["global_role"]
        }
        Insert: {
          agency_id: string
          created_at?: string
          email: string
          enabled_modules?: Json | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_agence?: string
          status?: string
          target_global_role?: Database["public"]["Enums"]["global_role"]
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string
          enabled_modules?: Json | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_agence?: string
          status?: string
          target_global_role?: Database["public"]["Enums"]["global_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_creation_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
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
      user_presence: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quick_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
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
      calculate_sla_status: {
        Args: { p_due_at: string; p_status: string }
        Returns: string
      }
      calculate_ticket_due_at: {
        Args: { p_category: string; p_created_at?: string; p_priority: string }
        Returns: string
      }
      calculate_ticket_due_at_v2: {
        Args: {
          p_category: string
          p_created_at?: string
          p_heat_priority: number
        }
        Returns: string
      }
      can_access_agency: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      can_transition_ticket: {
        Args: { _from_status: string; _to_status: string; _user_id: string }
        Returns: boolean
      }
      get_user_agency: { Args: { _user_id: string }; Returns: string }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_assigned_agencies: {
        Args: { _user_id: string }
        Returns: {
          agency_id: string
        }[]
      }
      get_user_global_role_level: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_ticket_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["apogee_ticket_role"]
      }
      has_franchiseur_access: { Args: { _user_id: string }; Returns: boolean }
      has_franchiseur_role: {
        Args: {
          _role: Database["public"]["Enums"]["franchiseur_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_min_global_role: {
        Args: { _min_level: number; _user_id: string }
        Returns: boolean
      }
      has_support_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      apogee_ticket_role: "developer" | "tester" | "franchiseur"
      collaborator_role:
        | "dirigeant"
        | "assistant"
        | "technicien"
        | "commercial"
        | "associe"
        | "tete_de_reseau"
        | "externe"
        | "autre"
      franchiseur_role: "animateur" | "directeur" | "dg"
      global_role:
        | "base_user"
        | "franchisee_user"
        | "franchisee_admin"
        | "franchisor_user"
        | "franchisor_admin"
        | "platform_admin"
        | "superadmin"
      rag_context_type:
        | "apogee"
        | "apporteurs"
        | "helpconfort"
        | "metier"
        | "franchise"
        | "documents"
        | "auto"
      system_role: "visiteur" | "utilisateur" | "support" | "admin"
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
      apogee_ticket_role: ["developer", "tester", "franchiseur"],
      collaborator_role: [
        "dirigeant",
        "assistant",
        "technicien",
        "commercial",
        "associe",
        "tete_de_reseau",
        "externe",
        "autre",
      ],
      franchiseur_role: ["animateur", "directeur", "dg"],
      global_role: [
        "base_user",
        "franchisee_user",
        "franchisee_admin",
        "franchisor_user",
        "franchisor_admin",
        "platform_admin",
        "superadmin",
      ],
      rag_context_type: [
        "apogee",
        "apporteurs",
        "helpconfort",
        "metier",
        "franchise",
        "documents",
        "auto",
      ],
      system_role: ["visiteur", "utilisateur", "support", "admin"],
    },
  },
} as const
