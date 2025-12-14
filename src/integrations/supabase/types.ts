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
      agency_commercial_profile: {
        Row: {
          agence_nom_long: string | null
          agency_id: string
          baseline: string | null
          created_at: string | null
          date_creation: string | null
          description_equipe: string | null
          email_contact: string | null
          id: string
          logo_agence_url: string | null
          nb_assistantes: number | null
          nb_techniciens: number | null
          phone_contact: string | null
          photo_equipe_url: string | null
          photo_lien_suivi_url: string | null
          photo_realisation1_apres_url: string | null
          photo_realisation1_avant_url: string | null
          photo_realisation2_apres_url: string | null
          photo_realisation2_avant_url: string | null
          photo_realisation3_apres_url: string | null
          photo_realisation3_avant_url: string | null
          photo_temoignage1_url: string | null
          photo_temoignage2_url: string | null
          rang_agence: string | null
          texte_comment_ca_se_passe: string | null
          texte_nos_competences: string | null
          texte_nos_engagements: string | null
          texte_nos_valeurs: string | null
          texte_qui_sommes_nous: string | null
          updated_at: string | null
          zones_intervention: string | null
        }
        Insert: {
          agence_nom_long?: string | null
          agency_id: string
          baseline?: string | null
          created_at?: string | null
          date_creation?: string | null
          description_equipe?: string | null
          email_contact?: string | null
          id?: string
          logo_agence_url?: string | null
          nb_assistantes?: number | null
          nb_techniciens?: number | null
          phone_contact?: string | null
          photo_equipe_url?: string | null
          photo_lien_suivi_url?: string | null
          photo_realisation1_apres_url?: string | null
          photo_realisation1_avant_url?: string | null
          photo_realisation2_apres_url?: string | null
          photo_realisation2_avant_url?: string | null
          photo_realisation3_apres_url?: string | null
          photo_realisation3_avant_url?: string | null
          photo_temoignage1_url?: string | null
          photo_temoignage2_url?: string | null
          rang_agence?: string | null
          texte_comment_ca_se_passe?: string | null
          texte_nos_competences?: string | null
          texte_nos_engagements?: string | null
          texte_nos_valeurs?: string | null
          texte_qui_sommes_nous?: string | null
          updated_at?: string | null
          zones_intervention?: string | null
        }
        Update: {
          agence_nom_long?: string | null
          agency_id?: string
          baseline?: string | null
          created_at?: string | null
          date_creation?: string | null
          description_equipe?: string | null
          email_contact?: string | null
          id?: string
          logo_agence_url?: string | null
          nb_assistantes?: number | null
          nb_techniciens?: number | null
          phone_contact?: string | null
          photo_equipe_url?: string | null
          photo_lien_suivi_url?: string | null
          photo_realisation1_apres_url?: string | null
          photo_realisation1_avant_url?: string | null
          photo_realisation2_apres_url?: string | null
          photo_realisation2_avant_url?: string | null
          photo_realisation3_apres_url?: string | null
          photo_realisation3_avant_url?: string | null
          photo_temoignage1_url?: string | null
          photo_temoignage2_url?: string | null
          rang_agence?: string | null
          texte_comment_ca_se_passe?: string | null
          texte_nos_competences?: string | null
          texte_nos_engagements?: string | null
          texte_nos_valeurs?: string | null
          texte_qui_sommes_nous?: string | null
          updated_at?: string | null
          zones_intervention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_commercial_profile_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_module_overrides: {
        Row: {
          agency_id: string
          created_at: string | null
          forced_enabled: boolean | null
          id: string
          module_key: string
          options_override: Json | null
          set_by: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          forced_enabled?: boolean | null
          id?: string
          module_key: string
          options_override?: Json | null
          set_by?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          forced_enabled?: boolean | null
          id?: string
          module_key?: string
          options_override?: Json | null
          set_by?: string | null
        }
        Relationships: []
      }
      agency_rh_roles: {
        Row: {
          agency_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          agency_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_rh_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_rh_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_rh_roles_user_id_fkey"
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
      agency_stamps: {
        Row: {
          agency_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_active: boolean
          stamp_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          is_active?: boolean
          stamp_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean
          stamp_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_stamps_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_stamps_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscription: {
        Row: {
          agency_id: string
          assigned_by: string | null
          created_at: string | null
          id: string
          status: string
          tier_key: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          agency_id: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          tier_key: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          agency_id?: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          tier_key?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscription_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "plan_tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      ai_search_cache: {
        Row: {
          created_at: string
          key: string
          ttl_seconds: number
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          ttl_seconds?: number
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          ttl_seconds?: number
          value?: Json
        }
        Relationships: []
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
      apogee_ticket_field_permissions: {
        Row: {
          can_delete_ticket: string[] | null
          can_edit_estimation: string[] | null
          can_edit_module: string[] | null
          can_edit_owner_side: string[] | null
          can_edit_priority: string[] | null
          can_merge_tickets: string[] | null
          can_qualify_ticket: string[] | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          can_delete_ticket?: string[] | null
          can_edit_estimation?: string[] | null
          can_edit_module?: string[] | null
          can_edit_owner_side?: string[] | null
          can_edit_priority?: string[] | null
          can_merge_tickets?: string[] | null
          can_qualify_ticket?: string[] | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          can_delete_ticket?: string[] | null
          can_edit_estimation?: string[] | null
          can_edit_module?: string[] | null
          can_edit_owner_side?: string[] | null
          can_edit_priority?: string[] | null
          can_merge_tickets?: string[] | null
          can_qualify_ticket?: string[] | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      apogee_ticket_tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      collaborator_document_folders: {
        Row: {
          collaborator_id: string
          created_at: string | null
          created_by: string | null
          doc_type: string
          id: string
          name: string
          parent_folder_id: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          created_by?: string | null
          doc_type: string
          id?: string
          name: string
          parent_folder_id?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          created_by?: string | null
          doc_type?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_document_folders_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "collaborator_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_documents: {
        Row: {
          agency_id: string
          collaborator_id: string
          created_at: string | null
          description: string | null
          doc_type: string
          employee_visible: boolean | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          leave_request_id: string | null
          period_month: number | null
          period_year: number | null
          search_vector: unknown
          subfolder: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          created_at?: string | null
          description?: string | null
          doc_type: string
          employee_visible?: boolean | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          leave_request_id?: string | null
          period_month?: number | null
          period_year?: number | null
          search_vector?: unknown
          subfolder?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          created_at?: string | null
          description?: string | null
          doc_type?: string
          employee_visible?: boolean | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          leave_request_id?: string | null
          period_month?: number | null
          period_year?: number | null
          search_vector?: unknown
          subfolder?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_documents_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_documents_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_sensitive_data: {
        Row: {
          birth_date_encrypted: string | null
          collaborator_id: string
          created_at: string | null
          emergency_contact_encrypted: string | null
          emergency_phone_encrypted: string | null
          id: string
          last_accessed_at: string | null
          last_accessed_by: string | null
          social_security_number_encrypted: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date_encrypted?: string | null
          collaborator_id: string
          created_at?: string | null
          emergency_contact_encrypted?: string | null
          emergency_phone_encrypted?: string | null
          id?: string
          last_accessed_at?: string | null
          last_accessed_by?: string | null
          social_security_number_encrypted?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date_encrypted?: string | null
          collaborator_id?: string
          created_at?: string | null
          emergency_contact_encrypted?: string | null
          emergency_phone_encrypted?: string | null
          id?: string
          last_accessed_at?: string | null
          last_accessed_by?: string | null
          social_security_number_encrypted?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_sensitive_data_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_sensitive_data_last_accessed_by_fkey"
            columns: ["last_accessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          address: string | null
          agency_id: string
          apogee_user_id: number | null
          birth_place: string | null
          city: string | null
          cni: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          hiring_date: string | null
          id: string
          is_registered_user: boolean
          last_name: string
          leaving_date: string | null
          notes: string | null
          permis: string | null
          phone: string | null
          postal_code: string | null
          role: string
          street: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          apogee_user_id?: number | null
          birth_place?: string | null
          city?: string | null
          cni?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          hiring_date?: string | null
          id?: string
          is_registered_user?: boolean
          last_name: string
          leaving_date?: string | null
          notes?: string | null
          permis?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          street?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          apogee_user_id?: number | null
          birth_place?: string | null
          city?: string | null
          cni?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          hiring_date?: string | null
          id?: string
          is_registered_user?: boolean
          last_name?: string
          leaving_date?: string | null
          notes?: string | null
          permis?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          street?: string | null
          type?: string | null
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
      conversation_members: {
        Row: {
          conversation_id: string
          deleted_at: string | null
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          deleted_at?: string | null
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          deleted_at?: string | null
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          last_message_at: string | null
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          name?: string | null
          type?: string
          updated_at?: string
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
      document_access_logs: {
        Row: {
          access_type: string
          accessed_by: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_by: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_accessed_by_fkey"
            columns: ["accessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "collaborator_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          agency_id: string
          collaborator_id: string
          created_at: string
          description: string | null
          employee_seen_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_at: string
          response_document_id: string | null
          response_note: string | null
          status: string
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          created_at?: string
          description?: string | null
          employee_seen_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          requested_at?: string
          response_document_id?: string | null
          response_note?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          created_at?: string
          description?: string | null
          employee_seen_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_at?: string
          response_document_id?: string | null
          response_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_response_document_id_fkey"
            columns: ["response_document_id"]
            isOneToOne: false
            referencedRelation: "collaborator_documents"
            referencedColumns: ["id"]
          },
        ]
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
      employment_contracts: {
        Row: {
          agency_id: string
          collaborator_id: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          job_category: string | null
          job_title: string | null
          start_date: string
          weekly_hours: number | null
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          contract_type: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_category?: string | null
          job_title?: string | null
          start_date: string
          weekly_hours?: number | null
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_category?: string | null
          job_title?: string | null
          start_date?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_contracts_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          dev_status: string
          display_order: number
          id: string
          is_enabled: boolean
          module_group: string
          module_key: string
          module_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dev_status?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          module_group: string
          module_key: string
          module_label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dev_status?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          module_group?: string
          module_key?: string
          module_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          agency_id: string
          assigned_collaborator_id: string | null
          brand: string | null
          created_at: string | null
          ct_alert_days: number | null
          ct_due_at: string | null
          fuel_type: string | null
          id: string
          insurance_alert_days: number | null
          insurance_company: string | null
          insurance_contract_number: string | null
          insurance_expiry_at: string | null
          last_ct_at: string | null
          last_revision_at: string | null
          leasing_alert_days: number | null
          leasing_company: string | null
          leasing_end_at: string | null
          leasing_monthly_amount: number | null
          mileage_km: number | null
          model: string | null
          name: string
          next_revision_at: string | null
          next_tires_change_at: string | null
          notes: string | null
          qr_token: string | null
          registration: string | null
          revision_alert_days: number | null
          status: string
          updated_at: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          agency_id: string
          assigned_collaborator_id?: string | null
          brand?: string | null
          created_at?: string | null
          ct_alert_days?: number | null
          ct_due_at?: string | null
          fuel_type?: string | null
          id?: string
          insurance_alert_days?: number | null
          insurance_company?: string | null
          insurance_contract_number?: string | null
          insurance_expiry_at?: string | null
          last_ct_at?: string | null
          last_revision_at?: string | null
          leasing_alert_days?: number | null
          leasing_company?: string | null
          leasing_end_at?: string | null
          leasing_monthly_amount?: number | null
          mileage_km?: number | null
          model?: string | null
          name: string
          next_revision_at?: string | null
          next_tires_change_at?: string | null
          notes?: string | null
          qr_token?: string | null
          registration?: string | null
          revision_alert_days?: number | null
          status?: string
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          agency_id?: string
          assigned_collaborator_id?: string | null
          brand?: string | null
          created_at?: string | null
          ct_alert_days?: number | null
          ct_due_at?: string | null
          fuel_type?: string | null
          id?: string
          insurance_alert_days?: number | null
          insurance_company?: string | null
          insurance_contract_number?: string | null
          insurance_expiry_at?: string | null
          last_ct_at?: string | null
          last_revision_at?: string | null
          leasing_alert_days?: number | null
          leasing_company?: string | null
          leasing_end_at?: string | null
          leasing_monthly_amount?: number | null
          mileage_km?: number | null
          model?: string | null
          name?: string
          next_revision_at?: string | null
          next_tires_change_at?: string | null
          notes?: string | null
          qr_token?: string | null
          registration?: string | null
          revision_alert_days?: number | null
          status?: string
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicles_assigned_collaborator_id_fkey"
            columns: ["assigned_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_content: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_images: Json | null
          generated_at: string | null
          generated_summary: string | null
          id: string
          source_block_id: string
          source_block_title: string
          source_category_id: string | null
          source_category_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_images?: Json | null
          generated_at?: string | null
          generated_summary?: string | null
          id?: string
          source_block_id: string
          source_block_title: string
          source_category_id?: string | null
          source_category_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_images?: Json | null
          generated_at?: string | null
          generated_summary?: string | null
          id?: string
          source_block_id?: string
          source_block_title?: string
          source_category_id?: string | null
          source_category_title?: string | null
          status?: string
          updated_at?: string
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
      french_holidays: {
        Row: {
          date: string
          id: string
          name: string
          year: number | null
        }
        Insert: {
          date: string
          id?: string
          name: string
          year?: number | null
        }
        Update: {
          date?: string
          id?: string
          name?: string
          year?: number | null
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
          content: string | null
          context_type: Database["public"]["Enums"]["rag_context_type"]
          created_at: string | null
          embedding: Json
          id: string
          metadata: Json | null
          source_id: string | null
          title: string | null
          tokens: number | null
          updated_at: string | null
        }
        Insert: {
          block_id: string
          block_slug: string
          block_title: string
          block_type: string
          chunk_index: number
          chunk_text: string
          content?: string | null
          context_type: Database["public"]["Enums"]["rag_context_type"]
          created_at?: string | null
          embedding: Json
          id?: string
          metadata?: Json | null
          source_id?: string | null
          title?: string | null
          tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          block_id?: string
          block_slug?: string
          block_title?: string
          block_type?: string
          chunk_index?: number
          chunk_text?: string
          content?: string | null
          context_type?: Database["public"]["Enums"]["rag_context_type"]
          created_at?: string | null
          embedding?: Json
          id?: string
          metadata?: Json | null
          source_id?: string | null
          title?: string | null
          tokens?: number | null
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
      hr_generated_documents: {
        Row: {
          agency_id: string
          collaborator_id: string
          content: string | null
          document_type: string
          file_path: string
          generated_at: string
          generated_by: string
          id: string
          metadata: Json | null
          request_id: string | null
          title: string
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          content?: string | null
          document_type: string
          file_path: string
          generated_at?: string
          generated_by: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          title: string
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          content?: string | null
          document_type?: string
          file_path?: string
          generated_at?: string
          generated_by?: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_generated_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_generated_documents_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_generated_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
        ]
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
      leave_requests: {
        Row: {
          agency_id: string
          collaborator_id: string
          created_at: string | null
          created_by: string | null
          days_count: number | null
          end_date: string | null
          event_subtype: string | null
          id: string
          justification_document_id: string | null
          manager_comment: string | null
          refusal_reason: string | null
          requires_justification: boolean | null
          start_date: string
          status: string
          type: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          created_at?: string | null
          created_by?: string | null
          days_count?: number | null
          end_date?: string | null
          event_subtype?: string | null
          id?: string
          justification_document_id?: string | null
          manager_comment?: string | null
          refusal_reason?: string | null
          requires_justification?: boolean | null
          start_date: string
          status?: string
          type: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          created_at?: string | null
          created_by?: string | null
          days_count?: number | null
          end_date?: string | null
          event_subtype?: string | null
          id?: string
          justification_document_id?: string | null
          manager_comment?: string | null
          refusal_reason?: string | null
          requires_justification?: boolean | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_justification_document_id_fkey"
            columns: ["justification_document_id"]
            isOneToOne: false
            referencedRelation: "collaborator_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_support_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_from_support: boolean
          sender_id: string
          sender_name: string
          session_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_from_support?: boolean
          sender_id: string
          sender_name: string
          session_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_from_support?: boolean
          sender_id?: string
          sender_name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_support_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_support_sessions: {
        Row: {
          agency_slug: string | null
          agent_id: string | null
          agent_name: string | null
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          created_at: string
          id: string
          notified_at: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          agency_slug?: string | null
          agent_id?: string | null
          agent_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          agency_slug?: string | null
          agent_id?: string | null
          agent_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      maintenance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agency_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          maintenance_event_id: string
          notified_channels: Json
          severity: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agency_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          maintenance_event_id: string
          notified_channels?: Json
          severity?: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agency_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          maintenance_event_id?: string
          notified_channels?: Json
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_alerts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_alerts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_alerts_maintenance_event_id_fkey"
            columns: ["maintenance_event_id"]
            isOneToOne: false
            referencedRelation: "maintenance_events"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_events: {
        Row: {
          agency_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          label: string
          mileage_km: number | null
          notes: string | null
          plan_item_id: string | null
          scheduled_at: string
          status: string
          target_type: string
          tool_id: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          label: string
          mileage_km?: number | null
          notes?: string | null
          plan_item_id?: string | null
          scheduled_at: string
          status?: string
          target_type: string
          tool_id?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          label?: string
          mileage_km?: number | null
          notes?: string | null
          plan_item_id?: string | null
          scheduled_at?: string
          status?: string
          target_type?: string
          tool_id?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plan_items: {
        Row: {
          created_at: string | null
          first_due_after_days: number | null
          frequency_unit: string
          frequency_value: number
          id: string
          is_mandatory: boolean
          label: string
          legal_reference: string | null
          plan_template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_due_after_days?: number | null
          frequency_unit: string
          frequency_value: number
          id?: string
          is_mandatory?: boolean
          label: string
          legal_reference?: string | null
          plan_template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_due_after_days?: number | null
          frequency_unit?: string
          frequency_value?: number
          id?: string
          is_mandatory?: boolean
          label?: string
          legal_reference?: string | null
          plan_template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plan_items_plan_template_id_fkey"
            columns: ["plan_template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plan_templates: {
        Row: {
          agency_id: string
          created_at: string | null
          description: string | null
          id: string
          is_default_for_category: boolean
          name: string
          target_category: string | null
          target_type: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default_for_category?: boolean
          name: string
          target_category?: string | null
          target_type: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default_for_category?: boolean
          name?: string
          target_category?: string | null
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plan_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_settings: {
        Row: {
          created_at: string
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean
          message: string
          updated_at: string
          whitelisted_user_ids: string[]
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          message?: string
          updated_at?: string
          whitelisted_user_ids?: string[]
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          message?: string
          updated_at?: string
          whitelisted_user_ids?: string[]
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_cache: {
        Row: {
          cache_key: string
          computed_at: string
          expires_at: string
          id: string
          metric_id: string
          result: Json
        }
        Insert: {
          cache_key: string
          computed_at?: string
          expires_at: string
          id?: string
          metric_id: string
          result: Json
        }
        Update: {
          cache_key?: string
          computed_at?: string
          expires_at?: string
          id?: string
          metric_id?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "metrics_cache_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_definitions: {
        Row: {
          cache_ttl_seconds: number | null
          compute_hint: string | null
          created_at: string
          created_by: string | null
          description_agence: string | null
          description_franchiseur: string | null
          formula: Json
          id: string
          input_sources: Json
          label: string
          scope: string
          updated_at: string
          validation_status: string
          visibility: Json | null
        }
        Insert: {
          cache_ttl_seconds?: number | null
          compute_hint?: string | null
          created_at?: string
          created_by?: string | null
          description_agence?: string | null
          description_franchiseur?: string | null
          formula?: Json
          id: string
          input_sources?: Json
          label: string
          scope: string
          updated_at?: string
          validation_status?: string
          visibility?: Json | null
        }
        Update: {
          cache_ttl_seconds?: number | null
          compute_hint?: string | null
          created_at?: string
          created_by?: string | null
          description_agence?: string | null
          description_franchiseur?: string | null
          formula?: Json
          id?: string
          input_sources?: Json
          label?: string
          scope?: string
          updated_at?: string
          validation_status?: string
          visibility?: Json | null
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
      payslip_data: {
        Row: {
          agency_id: string
          brut_cumule: number | null
          collaborator_id: string
          cout_global_employeur: number | null
          created_at: string
          document_id: string
          extracted_at: string | null
          extraction_error: string | null
          extraction_status: string
          extraction_warnings: string[] | null
          heures_base: number | null
          heures_cumulees: number | null
          id: string
          montant_brut_base: number | null
          montant_net_social: number | null
          net_a_payer: number | null
          net_imposable: number | null
          net_imposable_cumule: number | null
          periode_annee: number | null
          periode_date_debut: string | null
          periode_date_fin: string | null
          periode_mois: number | null
          raw_data: Json
          taux_horaire_brut: number | null
          total_brut: number | null
          total_charges_patronales: number | null
          total_charges_salariales: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          brut_cumule?: number | null
          collaborator_id: string
          cout_global_employeur?: number | null
          created_at?: string
          document_id: string
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          extraction_warnings?: string[] | null
          heures_base?: number | null
          heures_cumulees?: number | null
          id?: string
          montant_brut_base?: number | null
          montant_net_social?: number | null
          net_a_payer?: number | null
          net_imposable?: number | null
          net_imposable_cumule?: number | null
          periode_annee?: number | null
          periode_date_debut?: string | null
          periode_date_fin?: string | null
          periode_mois?: number | null
          raw_data?: Json
          taux_horaire_brut?: number | null
          total_brut?: number | null
          total_charges_patronales?: number | null
          total_charges_salariales?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          brut_cumule?: number | null
          collaborator_id?: string
          cout_global_employeur?: number | null
          created_at?: string
          document_id?: string
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          extraction_warnings?: string[] | null
          heures_base?: number | null
          heures_cumulees?: number | null
          id?: string
          montant_brut_base?: number | null
          montant_net_social?: number | null
          net_a_payer?: number | null
          net_imposable?: number | null
          net_imposable_cumule?: number | null
          periode_annee?: number | null
          periode_date_debut?: string | null
          periode_date_fin?: string | null
          periode_mois?: number | null
          raw_data?: Json
          taux_horaire_brut?: number | null
          total_brut?: number | null
          total_charges_patronales?: number | null
          total_charges_salariales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_data_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_data_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_data_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "collaborator_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit: {
        Row: {
          action: string
          agency_id: string | null
          changes: Json | null
          created_at: string | null
          editor_id: string
          entity_id: string | null
          entity_type: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          changes?: Json | null
          created_at?: string | null
          editor_id: string
          entity_id?: string | null
          entity_type: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          changes?: Json | null
          created_at?: string | null
          editor_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      plan_tier_modules: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          module_key: string
          options_override: Json | null
          tier_key: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          module_key: string
          options_override?: Json | null
          tier_key: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          module_key?: string
          options_override?: Json | null
          tier_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_tier_modules_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "plan_tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      plan_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          is_system: boolean | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          is_system?: boolean | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          is_system?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      planning_notifications: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          read_at: string | null
          recipient_user_id: string
          sender_user_id: string | null
          tech_id: number
          title: string
          week_start: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: string
          read_at?: string | null
          recipient_user_id: string
          sender_user_id?: string | null
          tech_id: number
          title: string
          week_start: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          read_at?: string | null
          recipient_user_id?: string
          sender_user_id?: string | null
          tech_id?: number
          title?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_notifications_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_signatures: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          sent_at: string | null
          sent_by_user_id: string | null
          signed_at: string | null
          signed_by_user_id: string | null
          tech_id: number
          tech_signature_png: string | null
          tech_signed_at: string | null
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          signed_at?: string | null
          signed_by_user_id?: string | null
          tech_id: number
          tech_signature_png?: string | null
          tech_signed_at?: string | null
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          signed_at?: string | null
          signed_by_user_id?: string | null
          tech_id?: number
          tech_signature_png?: string | null
          tech_signed_at?: string | null
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
          apogee_user_id: number | null
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
          is_salaried_manager: boolean | null
          last_name: string | null
          must_change_password: boolean | null
          phone: string | null
          role_agence: string | null
          support_level: number | null
          support_role: Database["public"]["Enums"]["support_role"] | null
          updated_at: string
        }
        Insert: {
          agence?: string | null
          agency_id?: string | null
          apogee_user_id?: number | null
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
          is_salaried_manager?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role_agence?: string | null
          support_level?: number | null
          support_role?: Database["public"]["Enums"]["support_role"] | null
          updated_at?: string
        }
        Update: {
          agence?: string | null
          agency_id?: string | null
          apogee_user_id?: number | null
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
          is_salaried_manager?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role_agence?: string | null
          support_level?: number | null
          support_role?: Database["public"]["Enums"]["support_role"] | null
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
          title: string | null
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
          title?: string | null
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
          title?: string | null
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
      rate_limits: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      rh_assets: {
        Row: {
          autres_equipements: Json | null
          carte_autre_fournisseur: string | null
          carte_autre_nom: string | null
          carte_autre_numero: string | null
          carte_bancaire: boolean | null
          carte_carburant: boolean | null
          collaborator_id: string
          created_at: string | null
          fournisseur_carte_bancaire: string | null
          fournisseur_carte_carburant: string | null
          id: string
          imei: string | null
          numero_carte_bancaire: string | null
          numero_carte_carburant: string | null
          tablette_telephone: string | null
          updated_at: string | null
          vehicule_attribue: string | null
        }
        Insert: {
          autres_equipements?: Json | null
          carte_autre_fournisseur?: string | null
          carte_autre_nom?: string | null
          carte_autre_numero?: string | null
          carte_bancaire?: boolean | null
          carte_carburant?: boolean | null
          collaborator_id: string
          created_at?: string | null
          fournisseur_carte_bancaire?: string | null
          fournisseur_carte_carburant?: string | null
          id?: string
          imei?: string | null
          numero_carte_bancaire?: string | null
          numero_carte_carburant?: string | null
          tablette_telephone?: string | null
          updated_at?: string | null
          vehicule_attribue?: string | null
        }
        Update: {
          autres_equipements?: Json | null
          carte_autre_fournisseur?: string | null
          carte_autre_nom?: string | null
          carte_autre_numero?: string | null
          carte_bancaire?: boolean | null
          carte_carburant?: boolean | null
          collaborator_id?: string
          created_at?: string | null
          fournisseur_carte_bancaire?: string | null
          fournisseur_carte_carburant?: string | null
          id?: string
          imei?: string | null
          numero_carte_bancaire?: string | null
          numero_carte_carburant?: string | null
          tablette_telephone?: string | null
          updated_at?: string | null
          vehicule_attribue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_assets_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_audit_log: {
        Row: {
          action_type: string
          agency_id: string
          collaborator_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          agency_id: string
          collaborator_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          agency_id?: string
          collaborator_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_audit_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_audit_log_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_competences_catalogue: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_competences_catalogue_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_competencies: {
        Row: {
          autres_habilitations: Json | null
          caces: Json | null
          collaborator_id: string
          competences_techniques: string[] | null
          created_at: string | null
          derniere_maj: string | null
          habilitation_electrique_date: string | null
          habilitation_electrique_statut: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          autres_habilitations?: Json | null
          caces?: Json | null
          collaborator_id: string
          competences_techniques?: string[] | null
          created_at?: string | null
          derniere_maj?: string | null
          habilitation_electrique_date?: string | null
          habilitation_electrique_statut?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          autres_habilitations?: Json | null
          caces?: Json | null
          collaborator_id?: string
          competences_techniques?: string[] | null
          created_at?: string | null
          derniere_maj?: string | null
          habilitation_electrique_date?: string | null
          habilitation_electrique_statut?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_competencies_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_epi_profiles: {
        Row: {
          collaborator_id: string
          created_at: string | null
          date_derniere_remise: string | null
          date_renouvellement: string | null
          epi_remis: string[] | null
          epi_requis: string[] | null
          id: string
          notes_securite: string | null
          pointure: string | null
          statut_epi: string | null
          taille_bas: string | null
          taille_gants: string | null
          taille_haut: string | null
          updated_at: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          date_derniere_remise?: string | null
          date_renouvellement?: string | null
          epi_remis?: string[] | null
          epi_requis?: string[] | null
          id?: string
          notes_securite?: string | null
          pointure?: string | null
          statut_epi?: string | null
          taille_bas?: string | null
          taille_gants?: string | null
          taille_haut?: string | null
          updated_at?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          date_derniere_remise?: string | null
          date_renouvellement?: string | null
          epi_remis?: string[] | null
          epi_requis?: string[] | null
          id?: string
          notes_securite?: string | null
          pointure?: string | null
          statut_epi?: string | null
          taille_bas?: string | null
          taille_gants?: string | null
          taille_haut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_epi_profiles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_it_access: {
        Row: {
          acces_outils: string[] | null
          collaborator_id: string
          created_at: string | null
          id: string
          identifiants_encrypted: string | null
          notes_it: string | null
          updated_at: string | null
        }
        Insert: {
          acces_outils?: string[] | null
          collaborator_id: string
          created_at?: string | null
          id?: string
          identifiants_encrypted?: string | null
          notes_it?: string | null
          updated_at?: string | null
        }
        Update: {
          acces_outils?: string[] | null
          collaborator_id?: string
          created_at?: string | null
          id?: string
          identifiants_encrypted?: string | null
          notes_it?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_it_access_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_letter_templates: {
        Row: {
          agency_id: string | null
          body_markdown: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          body_markdown: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          body_markdown?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_letter_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_notifications: {
        Row: {
          agency_id: string
          collaborator_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          read_at: string | null
          recipient_id: string | null
          related_document_id: string | null
          related_request_id: string | null
          sender_id: string | null
          title: string
        }
        Insert: {
          agency_id: string
          collaborator_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: string
          read_at?: string | null
          recipient_id?: string | null
          related_document_id?: string | null
          related_request_id?: string | null
          sender_id?: string | null
          title: string
        }
        Update: {
          agency_id?: string
          collaborator_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string | null
          related_document_id?: string | null
          related_request_id?: string | null
          sender_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notifications_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notifications_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "collaborator_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "rh_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_personnel_registry: {
        Row: {
          agency_id: string
          autorisation_date: string | null
          collaborator_id: string
          created_at: string
          created_by: string | null
          date_entree: string | null
          date_naissance: string | null
          date_sortie: string | null
          emploi_occupe: string | null
          field_modifications: Json
          id: string
          last_field_modified_at: string | null
          last_field_modified_by: string | null
          nationalite: string | null
          numero_ordre: number
          observations: string | null
          qualification: string | null
          sexe: string | null
          temps_partiel: boolean | null
          type_contrat: string | null
        }
        Insert: {
          agency_id: string
          autorisation_date?: string | null
          collaborator_id: string
          created_at?: string
          created_by?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          date_sortie?: string | null
          emploi_occupe?: string | null
          field_modifications?: Json
          id?: string
          last_field_modified_at?: string | null
          last_field_modified_by?: string | null
          nationalite?: string | null
          numero_ordre: number
          observations?: string | null
          qualification?: string | null
          sexe?: string | null
          temps_partiel?: boolean | null
          type_contrat?: string | null
        }
        Update: {
          agency_id?: string
          autorisation_date?: string | null
          collaborator_id?: string
          created_at?: string
          created_by?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          date_sortie?: string | null
          emploi_occupe?: string | null
          field_modifications?: Json
          id?: string
          last_field_modified_at?: string | null
          last_field_modified_by?: string | null
          nationalite?: string | null
          numero_ordre?: number
          observations?: string | null
          qualification?: string | null
          sexe?: string | null
          temps_partiel?: boolean | null
          type_contrat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_personnel_registry_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_personnel_registry_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_requests: {
        Row: {
          agency_id: string
          created_at: string | null
          decision_comment: string | null
          employee_can_download: boolean | null
          employee_user_id: string
          generated_letter_file_name: string | null
          generated_letter_path: string | null
          id: string
          payload: Json | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          decision_comment?: string | null
          employee_can_download?: boolean | null
          employee_user_id: string
          generated_letter_file_name?: string | null
          generated_letter_path?: string | null
          id?: string
          payload?: Json | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          decision_comment?: string | null
          employee_can_download?: boolean | null
          employee_user_id?: string
          generated_letter_file_name?: string | null
          generated_letter_path?: string | null
          id?: string
          payload?: Json | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_table_prefs: {
        Row: {
          column_order: string[] | null
          created_at: string | null
          hidden_columns: string[] | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          column_order?: string[] | null
          created_at?: string | null
          hidden_columns?: string[] | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          column_order?: string[] | null
          created_at?: string | null
          hidden_columns?: string[] | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      salary_history: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string | null
          decided_by: string | null
          effective_date: string
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          reason_type: string | null
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string | null
          decided_by?: string | null
          effective_date: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          reason_type?: string | null
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string | null
          decided_by?: string | null
          effective_date?: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          reason_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_dossier_overrides: {
        Row: {
          agency_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          cout_sav_manuel: number | null
          created_at: string
          id: string
          is_confirmed_sav: boolean | null
          notes: string | null
          project_id: number
          techniciens_override: number[] | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          cout_sav_manuel?: number | null
          created_at?: string
          id?: string
          is_confirmed_sav?: boolean | null
          notes?: string | null
          project_id: number
          techniciens_override?: number[] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          cout_sav_manuel?: number | null
          created_at?: string
          id?: string
          is_confirmed_sav?: boolean | null
          notes?: string | null
          project_id?: number
          techniciens_override?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sav_dossier_overrides_agency_id_fkey"
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
      sensitive_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          collaborator_id: string
          id: string
          ip_address: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          collaborator_id: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          collaborator_id?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_data_access_log_accessed_by_fkey"
            columns: ["accessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensitive_data_access_log_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_data_access_logs: {
        Row: {
          access_type: string
          accessed_at: string
          agency_slug: string
          client_id: string
          created_at: string
          id: string
          ip_address: string | null
          project_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type?: string
          accessed_at?: string
          agency_slug: string
          client_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          project_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_at?: string
          agency_slug?: string
          client_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          project_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      statia_custom_metrics: {
        Row: {
          agency_slug: string | null
          category: string
          created_at: string
          created_by: string
          definition_json: Json
          description: string | null
          id: string
          is_active: boolean
          label: string
          scope: string
          updated_at: string | null
        }
        Insert: {
          agency_slug?: string | null
          category?: string
          created_at?: string
          created_by: string
          definition_json: Json
          description?: string | null
          id: string
          is_active?: boolean
          label: string
          scope: string
          updated_at?: string | null
        }
        Update: {
          agency_slug?: string | null
          category?: string
          created_at?: string
          created_by?: string
          definition_json?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          scope?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      statia_metric_validations: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          metric_id: string
          suggestion: string | null
          updated_at: string
          validated: boolean
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          metric_id: string
          suggestion?: string | null
          updated_at?: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          metric_id?: string
          suggestion?: string | null
          updated_at?: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statia_metric_validations_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statia_widgets: {
        Row: {
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          metric_id: string
          title: string
          updated_at: string | null
          widget_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          metric_id: string
          title: string
          updated_at?: string | null
          widget_type?: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          metric_id?: string
          title?: string
          updated_at?: string | null
          widget_type?: string
        }
        Relationships: []
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
      support_ticket_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          ticket_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          ticket_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_actions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_views: {
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
            foreignKeyName: "support_ticket_views_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
          last_message_at: string | null
          last_message_by: string | null
          merged_into_ticket_id: string | null
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
          last_message_at?: string | null
          last_message_by?: string | null
          merged_into_ticket_id?: string | null
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
          last_message_at?: string | null
          last_message_by?: string | null
          merged_into_ticket_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "support_tickets_merged_into_ticket_id_fkey"
            columns: ["merged_into_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      tools: {
        Row: {
          agency_id: string
          assigned_collaborator_id: string | null
          category: string
          created_at: string | null
          default_plan_template_id: string | null
          id: string
          label: string
          qr_token: string | null
          serial_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          assigned_collaborator_id?: string | null
          category: string
          created_at?: string | null
          default_plan_template_id?: string | null
          id?: string
          label: string
          qr_token?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          assigned_collaborator_id?: string | null
          category?: string
          created_at?: string | null
          default_plan_template_id?: string | null
          id?: string
          label?: string
          qr_token?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_assigned_collaborator_id_fkey"
            columns: ["assigned_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_default_plan_template_id_fkey"
            columns: ["default_plan_template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          conversation_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted_at: string | null
          id: string
          ip_address: unknown
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version?: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
          withdrawn_at?: string | null
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
      user_dashboard_settings: {
        Row: {
          auto_arrange: boolean | null
          created_at: string | null
          grid_cols: number | null
          grid_rows: number | null
          id: string
          theme_variant: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_arrange?: boolean | null
          created_at?: string | null
          grid_cols?: number | null
          grid_rows?: number | null
          id?: string
          theme_variant?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_arrange?: boolean | null
          created_at?: string | null
          grid_cols?: number | null
          grid_rows?: number | null
          id?: string
          theme_variant?: string | null
          updated_at?: string | null
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
      user_modules: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          module_key: string
          options: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          module_key: string
          options?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          module_key?: string
          options?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_signatures: {
        Row: {
          created_at: string | null
          id: string
          signature_png_base64: string | null
          signature_svg: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          signature_png_base64?: string | null
          signature_svg: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          signature_png_base64?: string | null
          signature_svg?: string
          updated_at?: string | null
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
      user_widgets: {
        Row: {
          created_at: string | null
          height: number
          id: string
          is_visible: boolean | null
          position_x: number
          position_y: number
          state: string
          template_id: string
          updated_at: string | null
          user_id: string
          user_params: Json | null
          width: number
        }
        Insert: {
          created_at?: string | null
          height?: number
          id?: string
          is_visible?: boolean | null
          position_x?: number
          position_y?: number
          state?: string
          template_id: string
          updated_at?: string | null
          user_id: string
          user_params?: Json | null
          width?: number
        }
        Update: {
          created_at?: string | null
          height?: number
          id?: string
          is_visible?: boolean | null
          position_x?: number
          position_y?: number
          state?: string
          template_id?: string
          updated_at?: string | null
          user_id?: string
          user_params?: Json | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_widgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "widget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_templates: {
        Row: {
          created_at: string | null
          default_height: number | null
          default_params: Json | null
          default_width: number | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          min_global_role: number | null
          min_height: number | null
          min_width: number | null
          module_source: string
          name: string
          required_modules: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_height?: number | null
          default_params?: Json | null
          default_width?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          min_global_role?: number | null
          min_height?: number | null
          min_width?: number | null
          module_source: string
          name: string
          required_modules?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_height?: number | null
          default_params?: Json | null
          default_width?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          min_global_role?: number | null
          min_height?: number | null
          min_width?: number | null
          module_source?: string
          name?: string
          required_modules?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_leave_days: {
        Args: { p_end_date: string; p_start_date: string; p_type: string }
        Returns: number
      }
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
      can_manage_user_db: {
        Args: { p_editor_id: string; p_target_id: string }
        Returns: boolean
      }
      can_transition_ticket: {
        Args: { _from_status: string; _to_status: string; _user_id: string }
        Returns: boolean
      }
      can_user_login: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_ai_search_cache: { Args: never; Returns: number }
      cleanup_expired_request_locks: { Args: never; Returns: number }
      get_agency_enabled_modules: {
        Args: { p_agency_id: string }
        Returns: {
          enabled: boolean
          module_key: string
          options: Json
        }[]
      }
      get_agency_rh_managers: {
        Args: { p_agency_id: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_collaborator_sensitive_data: {
        Args: { p_collaborator_id: string }
        Returns: {
          birth_date: string
          emergency_contact: string
          emergency_phone: string
          ssn: string
        }[]
      }
      get_current_collaborator_id: { Args: never; Returns: string }
      get_helpi_stats: {
        Args: never
        Returns: {
          by_block_type: Json
          chunks_with_embedding: number
          last_indexed_at: string
          total_chunks: number
        }[]
      }
      get_module_options_v2: {
        Args: { _module_key: string; _user_id: string }
        Returns: Json
      }
      get_unread_rh_notifications_count: { Args: never; Returns: number }
      get_user_agency: { Args: { _user_id: string }; Returns: string }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_assigned_agencies: {
        Args: { _user_id: string }
        Returns: {
          agency_id: string
        }[]
      }
      get_user_effective_modules: {
        Args: { p_user_id: string }
        Returns: {
          enabled: boolean
          module_key: string
          options: Json
        }[]
      }
      get_user_global_role_level: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_support_level: { Args: { _user_id: string }; Returns: number }
      get_user_ticket_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["apogee_ticket_role"]
      }
      handle_document_request: {
        Args: {
          p_request_id: string
          p_response_document_id?: string
          p_response_note?: string
          p_status: string
        }
        Returns: {
          agency_id: string
          collaborator_id: string
          created_at: string
          description: string | null
          employee_seen_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_at: string
          response_document_id: string | null
          response_note: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "document_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_agency_rh_role: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      has_franchiseur_access: { Args: { _user_id: string }; Returns: boolean }
      has_min_global_role: {
        Args: { _min_level: number; _user_id: string }
        Returns: boolean
      }
      has_min_support_level: {
        Args: { _min_level: number; _user_id: string }
        Returns: boolean
      }
      has_module_v2: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_support_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_dirigeant: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { conv_id: string; uid: string }
        Returns: boolean
      }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
      lock_document_request: { Args: { p_request_id: string }; Returns: Json }
      log_document_access: {
        Args: { p_access_type: string; p_document_id: string }
        Returns: undefined
      }
      log_rh_action: {
        Args: {
          p_action_type: string
          p_collaborator_id?: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      mark_document_request_seen: {
        Args: { p_request_id: string }
        Returns: {
          agency_id: string
          collaborator_id: string
          created_at: string
          description: string | null
          employee_seen_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_at: string
          response_document_id: string | null
          response_note: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "document_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_rh_notifications_read: {
        Args: { p_notification_ids: string[] }
        Returns: number
      }
      match_knowledge: {
        Args: { p_allowed_block_types?: string[]; p_match_count?: number }
        Returns: {
          block_type: string
          content: string
          embedding: Json
          id: string
          source_id: string
          title: string
        }[]
      }
      request_document: {
        Args: { p_description?: string; p_request_type: string }
        Returns: {
          agency_id: string
          collaborator_id: string
          created_at: string
          description: string | null
          employee_seen_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_at: string
          response_document_id: string | null
          response_note: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "document_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_collaborator_documents: {
        Args: { p_collaborator_id: string; p_search_query: string }
        Returns: {
          agency_id: string
          collaborator_id: string
          created_at: string | null
          description: string | null
          doc_type: string
          employee_visible: boolean | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          leave_request_id: string | null
          period_month: number | null
          period_year: number | null
          search_vector: unknown
          subfolder: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collaborator_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      unlock_document_request: { Args: { p_request_id: string }; Returns: Json }
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
        | "marche_batiment"
        | "groupe_laposte_axeo"
        | "faq"
      support_role: "none" | "agent" | "admin"
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
        "marche_batiment",
        "groupe_laposte_axeo",
        "faq",
      ],
      support_role: ["none", "agent", "admin"],
      system_role: ["visiteur", "utilisateur", "support", "admin"],
    },
  },
} as const
