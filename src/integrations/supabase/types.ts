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
      apogee_agencies: {
        Row: {
          adresse: string | null
          code_postal: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
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
      apogee_tickets: {
        Row: {
          action_type: string | null
          apogee_status_raw: string | null
          created_at: string
          created_by_user_id: string | null
          created_from: string
          description: string | null
          element_concerne: string
          external_key: string | null
          h_max: number | null
          h_min: number | null
          hc_status_raw: string | null
          hca_code: string | null
          heat_priority: number | null
          id: string
          impact_tags: string[] | null
          is_qualified: boolean | null
          kanban_status: string
          module: string | null
          module_area: string | null
          needs_completion: boolean | null
          notes_internes: string | null
          original_description: string | null
          original_title: string | null
          owner_side: string | null
          priority: string | null
          priority_normalized: string | null
          qualif_status: string | null
          qualified_at: string | null
          qualified_by: string | null
          reported_by: string | null
          severity: string | null
          source_row_index: number | null
          source_sheet: string | null
          theme: string | null
          ticket_type: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          apogee_status_raw?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_from?: string
          description?: string | null
          element_concerne: string
          external_key?: string | null
          h_max?: number | null
          h_min?: number | null
          hc_status_raw?: string | null
          hca_code?: string | null
          heat_priority?: number | null
          id?: string
          impact_tags?: string[] | null
          is_qualified?: boolean | null
          kanban_status?: string
          module?: string | null
          module_area?: string | null
          needs_completion?: boolean | null
          notes_internes?: string | null
          original_description?: string | null
          original_title?: string | null
          owner_side?: string | null
          priority?: string | null
          priority_normalized?: string | null
          qualif_status?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reported_by?: string | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          theme?: string | null
          ticket_type?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          apogee_status_raw?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_from?: string
          description?: string | null
          element_concerne?: string
          external_key?: string | null
          h_max?: number | null
          h_min?: number | null
          hc_status_raw?: string | null
          hca_code?: string | null
          heat_priority?: number | null
          id?: string
          impact_tags?: string[] | null
          is_qualified?: boolean | null
          kanban_status?: string
          module?: string | null
          module_area?: string | null
          needs_completion?: boolean | null
          notes_internes?: string | null
          original_description?: string | null
          original_title?: string | null
          owner_side?: string | null
          priority?: string | null
          priority_normalized?: string | null
          qualif_status?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reported_by?: string | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          theme?: string | null
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
            foreignKeyName: "apogee_tickets_module_fkey"
            columns: ["module"]
            isOneToOne: false
            referencedRelation: "apogee_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apogee_tickets_priority_fkey"
            columns: ["priority"]
            isOneToOne: false
            referencedRelation: "apogee_priorities"
            referencedColumns: ["id"]
          },
        ]
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
          chat_context: string | null
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
        }
        Insert: {
          admin_notes?: string | null
          answer?: string | null
          chat_context?: string | null
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
        }
        Update: {
          admin_notes?: string | null
          answer?: string | null
          chat_context?: string | null
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
          assigned_to: string | null
          category: string | null
          chatbot_conversation: Json | null
          created_at: string
          escalated_from_chat: boolean | null
          escalation_history: Json | null
          has_attachments: boolean
          id: string
          is_live_chat: boolean | null
          priority: string
          rating: number | null
          rating_comment: string | null
          resolved_at: string | null
          service: string | null
          source: string
          status: string
          subject: string
          support_level: number | null
          updated_at: string
          user_id: string
          viewed_by_support_at: string | null
        }
        Insert: {
          agency_slug?: string | null
          assigned_to?: string | null
          category?: string | null
          chatbot_conversation?: Json | null
          created_at?: string
          escalated_from_chat?: boolean | null
          escalation_history?: Json | null
          has_attachments?: boolean
          id?: string
          is_live_chat?: boolean | null
          priority?: string
          rating?: number | null
          rating_comment?: string | null
          resolved_at?: string | null
          service?: string | null
          source?: string
          status?: string
          subject?: string
          support_level?: number | null
          updated_at?: string
          user_id: string
          viewed_by_support_at?: string | null
        }
        Update: {
          agency_slug?: string | null
          assigned_to?: string | null
          category?: string | null
          chatbot_conversation?: Json | null
          created_at?: string
          escalated_from_chat?: boolean | null
          escalation_history?: Json | null
          has_attachments?: boolean
          id?: string
          is_live_chat?: boolean | null
          priority?: string
          rating?: number | null
          rating_comment?: string | null
          resolved_at?: string | null
          service?: string | null
          source?: string
          status?: string
          subject?: string
          support_level?: number | null
          updated_at?: string
          user_id?: string
          viewed_by_support_at?: string | null
        }
        Relationships: []
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
      get_user_agency: { Args: { _user_id: string }; Returns: string }
      get_user_global_role_level: {
        Args: { _user_id: string }
        Returns: number
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
    }
    Enums: {
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
      system_role: ["visiteur", "utilisateur", "support", "admin"],
    },
  },
} as const
