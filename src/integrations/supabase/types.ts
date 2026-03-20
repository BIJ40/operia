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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["activity_actor_type"]
          agency_id: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json | null
          module: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["activity_actor_type"]
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          module: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["activity_actor_type"]
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          module?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_admin_documents: {
        Row: {
          agency_id: string
          document_type: string
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          label: string
          mime_type: string | null
          notes: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          agency_id: string
          document_type: string
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          label: string
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string
          document_type?: string
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          label?: string
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_admin_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      agency_financial_charges: {
        Row: {
          agency_id: string
          amount: number
          category: string
          charge_type: string
          created_at: string | null
          end_month: string | null
          id: string
          label: string | null
          notes: string | null
          start_month: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          amount?: number
          category: string
          charge_type: string
          created_at?: string | null
          end_month?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          start_month: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          amount?: number
          category?: string
          charge_type?: string
          created_at?: string | null
          end_month?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          start_month?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_financial_charges_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_financial_months: {
        Row: {
          achats: number | null
          agency_id: string
          aides_emploi: number | null
          ca_total: number | null
          charges_patronales_franchise: number | null
          charges_patronales_improductifs: number | null
          charges_patronales_intervenants: number | null
          created_at: string | null
          frais_franchise: number | null
          frais_personnel_improductifs: number | null
          frais_personnel_intervenants: number | null
          heures_facturees: number | null
          id: string
          locked_at: string | null
          locked_by: string | null
          month: number
          nb_factures: number | null
          nb_heures_payees_improductifs: number | null
          nb_heures_payees_productifs: number | null
          nb_interventions: number | null
          nb_salaries: number | null
          notes: string | null
          salaires_brut_franchise: number | null
          salaires_brut_improductifs: number | null
          salaires_brut_intervenants: number | null
          sous_traitance: number | null
          sync_version: number | null
          synced_at: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          achats?: number | null
          agency_id: string
          aides_emploi?: number | null
          ca_total?: number | null
          charges_patronales_franchise?: number | null
          charges_patronales_improductifs?: number | null
          charges_patronales_intervenants?: number | null
          created_at?: string | null
          frais_franchise?: number | null
          frais_personnel_improductifs?: number | null
          frais_personnel_intervenants?: number | null
          heures_facturees?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: number
          nb_factures?: number | null
          nb_heures_payees_improductifs?: number | null
          nb_heures_payees_productifs?: number | null
          nb_interventions?: number | null
          nb_salaries?: number | null
          notes?: string | null
          salaires_brut_franchise?: number | null
          salaires_brut_improductifs?: number | null
          salaires_brut_intervenants?: number | null
          sous_traitance?: number | null
          sync_version?: number | null
          synced_at?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          achats?: number | null
          agency_id?: string
          aides_emploi?: number | null
          ca_total?: number | null
          charges_patronales_franchise?: number | null
          charges_patronales_improductifs?: number | null
          charges_patronales_intervenants?: number | null
          created_at?: string | null
          frais_franchise?: number | null
          frais_personnel_improductifs?: number | null
          frais_personnel_intervenants?: number | null
          heures_facturees?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          nb_factures?: number | null
          nb_heures_payees_improductifs?: number | null
          nb_heures_payees_productifs?: number | null
          nb_interventions?: number | null
          nb_salaries?: number | null
          notes?: string | null
          salaires_brut_franchise?: number | null
          salaires_brut_improductifs?: number | null
          salaires_brut_intervenants?: number | null
          sous_traitance?: number | null
          sync_version?: number | null
          synced_at?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_financial_months_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_overhead_rules: {
        Row: {
          agency_id: string
          allocation_mode: Database["public"]["Enums"]["overhead_allocation_mode"]
          allocation_value: number
          amount_ht: number
          cost_type: Database["public"]["Enums"]["overhead_cost_type"]
          created_at: string
          created_by: string | null
          id: string
          period_month: string | null
          updated_at: string
          validation_status: Database["public"]["Enums"]["cost_validation_type"]
        }
        Insert: {
          agency_id: string
          allocation_mode?: Database["public"]["Enums"]["overhead_allocation_mode"]
          allocation_value?: number
          amount_ht?: number
          cost_type: Database["public"]["Enums"]["overhead_cost_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          period_month?: string | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
        }
        Update: {
          agency_id?: string
          allocation_mode?: Database["public"]["Enums"]["overhead_allocation_mode"]
          allocation_value?: number
          amount_ht?: number
          cost_type?: Database["public"]["Enums"]["overhead_cost_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          period_month?: string | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "agency_overhead_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
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
      apogee_ticket_support_exchanges: {
        Row: {
          created_at: string
          id: string
          is_from_support: boolean
          message: string
          read_at: string | null
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_support?: boolean
          message: string
          read_at?: string | null
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_support?: boolean
          message?: string
          read_at?: string | null
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apogee_ticket_support_exchanges_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apogee_tickets"
            referencedColumns: ["id"]
          },
        ]
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
          initiator_profile: Json | null
          is_qualified: boolean | null
          is_urgent_support: boolean | null
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
          roadmap_enabled: boolean | null
          roadmap_month: number | null
          roadmap_year: number | null
          severity: string | null
          source_row_index: number | null
          source_sheet: string | null
          source_support_ticket_id: string | null
          support_initiator_user_id: string | null
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
          initiator_profile?: Json | null
          is_qualified?: boolean | null
          is_urgent_support?: boolean | null
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
          roadmap_enabled?: boolean | null
          roadmap_month?: number | null
          roadmap_year?: number | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          source_support_ticket_id?: string | null
          support_initiator_user_id?: string | null
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
          initiator_profile?: Json | null
          is_qualified?: boolean | null
          is_urgent_support?: boolean | null
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
          roadmap_enabled?: boolean | null
          roadmap_month?: number | null
          roadmap_year?: number | null
          severity?: string | null
          source_row_index?: number | null
          source_sheet?: string | null
          source_support_ticket_id?: string | null
          support_initiator_user_id?: string | null
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
      apporteur_access_logs: {
        Row: {
          action: string
          agency_id: string
          apporteur_user_id: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          agency_id: string
          apporteur_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          agency_id?: string
          apporteur_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_access_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_access_logs_apporteur_user_id_fkey"
            columns: ["apporteur_user_id"]
            isOneToOne: false
            referencedRelation: "apporteur_users"
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
      apporteur_contacts: {
        Row: {
          agency_id: string
          apporteur_id: string
          created_at: string
          email: string | null
          first_name: string
          fonction: string | null
          id: string
          is_primary: boolean
          last_name: string
          mobile: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          apporteur_id: string
          created_at?: string
          email?: string | null
          first_name: string
          fonction?: string | null
          id?: string
          is_primary?: boolean
          last_name: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          apporteur_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          fonction?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_contacts_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_intervention_requests: {
        Row: {
          address: string
          agency_id: string
          apogee_project_id: number | null
          apporteur_id: string
          apporteur_manager_id: string | null
          apporteur_user_id: string | null
          availability: string | null
          city: string | null
          comments: string | null
          created_at: string
          description: string
          id: string
          internal_ticket_id: string | null
          owner_name: string | null
          postal_code: string | null
          reference: string | null
          request_type: string
          status: string
          tenant_email: string | null
          tenant_name: string
          tenant_phone: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          address: string
          agency_id: string
          apogee_project_id?: number | null
          apporteur_id: string
          apporteur_manager_id?: string | null
          apporteur_user_id?: string | null
          availability?: string | null
          city?: string | null
          comments?: string | null
          created_at?: string
          description: string
          id?: string
          internal_ticket_id?: string | null
          owner_name?: string | null
          postal_code?: string | null
          reference?: string | null
          request_type: string
          status?: string
          tenant_email?: string | null
          tenant_name: string
          tenant_phone?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          address?: string
          agency_id?: string
          apogee_project_id?: number | null
          apporteur_id?: string
          apporteur_manager_id?: string | null
          apporteur_user_id?: string | null
          availability?: string | null
          city?: string | null
          comments?: string | null
          created_at?: string
          description?: string
          id?: string
          internal_ticket_id?: string | null
          owner_name?: string | null
          postal_code?: string | null
          reference?: string | null
          request_type?: string
          status?: string
          tenant_email?: string | null
          tenant_name?: string
          tenant_phone?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_intervention_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_intervention_requests_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_intervention_requests_apporteur_manager_id_fkey"
            columns: ["apporteur_manager_id"]
            isOneToOne: false
            referencedRelation: "apporteur_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_intervention_requests_apporteur_user_id_fkey"
            columns: ["apporteur_user_id"]
            isOneToOne: false
            referencedRelation: "apporteur_users"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_invitation_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          manager_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          manager_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          manager_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_invitation_links_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "apporteur_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_managers: {
        Row: {
          agency_id: string
          apporteur_id: string
          created_at: string
          email: string
          email_verified_at: string | null
          first_name: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          last_login_at: string | null
          last_name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          apporteur_id: string
          created_at?: string
          email: string
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          apporteur_id?: string
          created_at?: string
          email?: string
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_managers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_managers_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_managers_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_otp_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          manager_id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          manager_id: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          manager_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_otp_codes_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "apporteur_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_project_links: {
        Row: {
          agency_id: string
          apogee_project_id: number
          apporteur_id: string
          created_at: string
          id: string
        }
        Insert: {
          agency_id: string
          apogee_project_id: number
          apporteur_id: string
          created_at?: string
          id?: string
        }
        Update: {
          agency_id?: string
          apogee_project_id?: number
          apporteur_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_project_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_project_links_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          manager_id: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          manager_id: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          manager_id?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "apporteur_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteur_users: {
        Row: {
          activated_at: string | null
          agency_id: string
          apporteur_id: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          last_name: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          agency_id: string
          apporteur_id: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_name?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          agency_id?: string
          apporteur_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_users_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apporteur_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apporteurs: {
        Row: {
          agency_id: string
          apogee_client_id: number | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          portal_enabled: boolean
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          apogee_client_id?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          portal_enabled?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          apogee_client_id?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          portal_enabled?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apporteurs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_story_batches: {
        Row: {
          agency_id: string
          bible_ok_count: number | null
          campaign_mode: string | null
          coverage_percent: number | null
          created_at: string
          created_by: string | null
          diversity_score_avg: number | null
          generated_size: number | null
          id: string
          input_params: Json | null
          report: Json | null
          requested_size: number
          status: string
          updated_at: string
          valid_count: number | null
        }
        Insert: {
          agency_id: string
          bible_ok_count?: number | null
          campaign_mode?: string | null
          coverage_percent?: number | null
          created_at?: string
          created_by?: string | null
          diversity_score_avg?: number | null
          generated_size?: number | null
          id?: string
          input_params?: Json | null
          report?: Json | null
          requested_size: number
          status?: string
          updated_at?: string
          valid_count?: number | null
        }
        Update: {
          agency_id?: string
          bible_ok_count?: number | null
          campaign_mode?: string | null
          coverage_percent?: number | null
          created_at?: string
          created_by?: string | null
          diversity_score_avg?: number | null
          generated_size?: number | null
          id?: string
          input_params?: Json | null
          report?: Json | null
          requested_size?: number
          status?: string
          updated_at?: string
          valid_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bd_story_batches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_story_stories: {
        Row: {
          agency_id: string
          batch_id: string | null
          bible_violation_count: number
          board_prompt_master: string | null
          campaign_mode: string | null
          client_profile_slug: string | null
          created_at: string
          created_by: string | null
          cta_mode: string | null
          diversity_score: number | null
          id: string
          is_favorite: boolean | null
          narrative_distance_score: number | null
          panels: Json
          problem_slug: string
          status: string
          story_family: string
          story_json: Json
          story_key: string
          summary: string | null
          technician_slug: string
          template_key: string
          title: string
          tone: string | null
          universe: string
          updated_at: string
          validation_is_valid: boolean
          validation_issue_count: number
        }
        Insert: {
          agency_id: string
          batch_id?: string | null
          bible_violation_count?: number
          board_prompt_master?: string | null
          campaign_mode?: string | null
          client_profile_slug?: string | null
          created_at?: string
          created_by?: string | null
          cta_mode?: string | null
          diversity_score?: number | null
          id?: string
          is_favorite?: boolean | null
          narrative_distance_score?: number | null
          panels?: Json
          problem_slug: string
          status?: string
          story_family: string
          story_json?: Json
          story_key: string
          summary?: string | null
          technician_slug: string
          template_key: string
          title: string
          tone?: string | null
          universe: string
          updated_at?: string
          validation_is_valid?: boolean
          validation_issue_count?: number
        }
        Update: {
          agency_id?: string
          batch_id?: string | null
          bible_violation_count?: number
          board_prompt_master?: string | null
          campaign_mode?: string | null
          client_profile_slug?: string | null
          created_at?: string
          created_by?: string | null
          cta_mode?: string | null
          diversity_score?: number | null
          id?: string
          is_favorite?: boolean | null
          narrative_distance_score?: number | null
          panels?: Json
          problem_slug?: string
          status?: string
          story_family?: string
          story_json?: Json
          story_key?: string
          summary?: string | null
          technician_slug?: string
          template_key?: string
          title?: string
          tone?: string | null
          universe?: string
          updated_at?: string
          validation_is_valid?: boolean
          validation_issue_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bd_story_stories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_story_stories_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bd_story_batches"
            referencedColumns: ["id"]
          },
        ]
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
          user_pseudo: string | null
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
          user_pseudo?: string | null
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
          user_pseudo?: string | null
        }
        Relationships: []
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
      collaborator_sub_skills: {
        Row: {
          collaborator_id: string
          created_at: string | null
          id: string
          sub_skill_id: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          id?: string
          sub_skill_id: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          id?: string
          sub_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_sub_skills_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_sub_skills_sub_skill_id_fkey"
            columns: ["sub_skill_id"]
            isOneToOne: false
            referencedRelation: "competence_sub_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_work_profiles: {
        Row: {
          break_minutes_default: number
          collaborator_id: string
          created_at: string
          id: string
          updated_at: string
          weekly_contract_minutes: number
          work_week_starts_on: number
        }
        Insert: {
          break_minutes_default?: number
          collaborator_id: string
          created_at?: string
          id?: string
          updated_at?: string
          weekly_contract_minutes?: number
          work_week_starts_on?: number
        }
        Update: {
          break_minutes_default?: number
          collaborator_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          weekly_contract_minutes?: number
          work_week_starts_on?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_work_profiles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
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
          lunch_end: string | null
          lunch_start: string | null
          notes: string | null
          permis: string | null
          phone: string | null
          postal_code: string | null
          role: string
          street: string | null
          type: string | null
          updated_at: string
          user_id: string | null
          work_days: number[] | null
          work_end: string | null
          work_start: string | null
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
          lunch_end?: string | null
          lunch_start?: string | null
          notes?: string | null
          permis?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          street?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[] | null
          work_end?: string | null
          work_start?: string | null
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
          lunch_end?: string | null
          lunch_start?: string | null
          notes?: string | null
          permis?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          street?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[] | null
          work_end?: string | null
          work_start?: string | null
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
      competence_sub_skills: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          univers_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          univers_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          univers_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competence_sub_skills_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competence_sub_skills_univers_id_fkey"
            columns: ["univers_id"]
            isOneToOne: false
            referencedRelation: "univers_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      deadline_alert_acknowledgements: {
        Row: {
          acknowledged_on: string
          agency_id: string
          alert_ids: string[]
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_on?: string
          agency_id: string
          alert_ids?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_on?: string
          agency_id?: string
          alert_ids?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
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
      doc_instances: {
        Row: {
          agency_id: string
          collaborator_id: string | null
          created_at: string
          created_by: string | null
          final_path: string | null
          id: string
          name: string
          preview_path: string | null
          status: string
          template_id: string
          token_values: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          collaborator_id?: string | null
          created_at?: string
          created_by?: string | null
          final_path?: string | null
          id?: string
          name: string
          preview_path?: string | null
          status?: string
          template_id: string
          token_values?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          collaborator_id?: string | null
          created_at?: string
          created_by?: string | null
          final_path?: string | null
          id?: string
          name?: string
          preview_path?: string | null
          status?: string
          template_id?: string
          token_values?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_instances_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_instances_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_templates: {
        Row: {
          agency_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          docx_storage_path: string
          id: string
          is_published: boolean
          name: string
          scope: string
          tokens: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          docx_storage_path: string
          id?: string
          is_published?: boolean
          name: string
          scope?: string
          tokens?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          docx_storage_path?: string
          id?: string
          is_published?: boolean
          name?: string
          scope?: string
          tokens?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      duration_calibration: {
        Row: {
          agency_id: string
          id: string
          planned_to_real_ratio: number | null
          sample_size: number | null
          tech_apogee_id: number
          univers: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          id?: string
          planned_to_real_ratio?: number | null
          sample_size?: number | null
          tech_apogee_id: number
          univers: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          id?: string
          planned_to_real_ratio?: number | null
          sample_size?: number | null
          tech_apogee_id?: number
          univers?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duration_calibration_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_cost_profiles: {
        Row: {
          agency_id: string
          collaborator_id: string
          cost_source: Database["public"]["Enums"]["cost_source_type"]
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employer_charges_rate: number | null
          employer_monthly_cost: number | null
          equipment_monthly_cost: number | null
          fuel_monthly_cost: number | null
          id: string
          loaded_hourly_cost: number | null
          monthly_paid_hours: number | null
          monthly_productive_hours: number | null
          other_monthly_costs: number | null
          salary_gross_monthly: number | null
          updated_at: string
          vehicle_monthly_cost: number | null
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          cost_source?: Database["public"]["Enums"]["cost_source_type"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employer_charges_rate?: number | null
          employer_monthly_cost?: number | null
          equipment_monthly_cost?: number | null
          fuel_monthly_cost?: number | null
          id?: string
          loaded_hourly_cost?: number | null
          monthly_paid_hours?: number | null
          monthly_productive_hours?: number | null
          other_monthly_costs?: number | null
          salary_gross_monthly?: number | null
          updated_at?: string
          vehicle_monthly_cost?: number | null
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          cost_source?: Database["public"]["Enums"]["cost_source_type"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employer_charges_rate?: number | null
          employer_monthly_cost?: number | null
          equipment_monthly_cost?: number | null
          fuel_monthly_cost?: number | null
          id?: string
          loaded_hourly_cost?: number | null
          monthly_paid_hours?: number | null
          monthly_productive_hours?: number | null
          other_monthly_costs?: number | null
          salary_gross_monthly?: number | null
          updated_at?: string
          vehicle_monthly_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_cost_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cost_profiles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_documents: {
        Row: {
          agency_id: string
          collaborator_id: string
          created_at: string
          created_by: string | null
          extracted_data_json: Json | null
          extracted_employer_cost: number | null
          extracted_gross_salary: number | null
          extracted_hours: number | null
          extracted_net_salary: number | null
          extraction_status: Database["public"]["Enums"]["extraction_status_type"]
          file_path: string
          id: string
          period_month: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: Database["public"]["Enums"]["validation_status_type"]
        }
        Insert: {
          agency_id: string
          collaborator_id: string
          created_at?: string
          created_by?: string | null
          extracted_data_json?: Json | null
          extracted_employer_cost?: number | null
          extracted_gross_salary?: number | null
          extracted_hours?: number | null
          extracted_net_salary?: number | null
          extraction_status?: Database["public"]["Enums"]["extraction_status_type"]
          file_path: string
          id?: string
          period_month?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status_type"]
        }
        Update: {
          agency_id?: string
          collaborator_id?: string
          created_at?: string
          created_by?: string | null
          extracted_data_json?: Json | null
          extracted_employer_cost?: number | null
          extracted_gross_salary?: number | null
          extracted_hours?: number | null
          extracted_net_salary?: number | null
          extraction_status?: Database["public"]["Enums"]["extraction_status_type"]
          file_path?: string
          id?: string
          period_month?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_documents_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
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
      epi_assignments: {
        Row: {
          agency_id: string
          assigned_at: string
          assigned_by_user_id: string
          catalog_item_id: string
          created_at: string
          expected_renewal_at: string | null
          id: string
          notes: string | null
          returned_at: string | null
          serial_number: string | null
          size: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          assigned_at?: string
          assigned_by_user_id: string
          catalog_item_id: string
          created_at?: string
          expected_renewal_at?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          serial_number?: string | null
          size?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          assigned_at?: string
          assigned_by_user_id?: string
          catalog_item_id?: string
          created_at?: string
          expected_renewal_at?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          serial_number?: string | null
          size?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_assignments_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_catalog_items: {
        Row: {
          agency_id: string | null
          available_sizes: string[] | null
          category: string
          created_at: string
          default_renewal_days: number | null
          description: string | null
          id: string
          is_active: boolean
          is_personal: boolean
          item_type: string
          name: string
          requires_size: boolean
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          available_sizes?: string[] | null
          category: string
          created_at?: string
          default_renewal_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_personal?: boolean
          item_type?: string
          name: string
          requires_size?: boolean
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          available_sizes?: string[] | null
          category?: string
          created_at?: string
          default_renewal_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_personal?: boolean
          item_type?: string
          name?: string
          requires_size?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_catalog_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_documents: {
        Row: {
          ack_id: string | null
          agency_id: string
          created_at: string
          doc_type: string
          generated_at: string
          id: string
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          ack_id?: string | null
          agency_id: string
          created_at?: string
          doc_type: string
          generated_at?: string
          id?: string
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          ack_id?: string | null
          agency_id?: string
          created_at?: string
          doc_type?: string
          generated_at?: string
          id?: string
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_documents_ack_id_fkey"
            columns: ["ack_id"]
            isOneToOne: false
            referencedRelation: "epi_monthly_acknowledgements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_incident_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          incident_id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          incident_id: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          incident_id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epi_incident_attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "epi_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_incident_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_incidents: {
        Row: {
          agency_id: string
          assignment_id: string | null
          catalog_item_id: string | null
          created_at: string
          description: string
          handled_by_user_id: string | null
          id: string
          incident_type: string
          reporter_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assignment_id?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description: string
          handled_by_user_id?: string | null
          id?: string
          incident_type: string
          reporter_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assignment_id?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          handled_by_user_id?: string | null
          id?: string
          incident_type?: string
          reporter_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_incidents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_incidents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "epi_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_incidents_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_incidents_handled_by_user_id_fkey"
            columns: ["handled_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_incidents_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_monthly_ack_items: {
        Row: {
          ack_id: string
          assignment_id: string
          catalog_item_id: string
          created_at: string
          id: string
          is_confirmed_present: boolean
          notes: string | null
          size: string | null
        }
        Insert: {
          ack_id: string
          assignment_id: string
          catalog_item_id: string
          created_at?: string
          id?: string
          is_confirmed_present?: boolean
          notes?: string | null
          size?: string | null
        }
        Update: {
          ack_id?: string
          assignment_id?: string
          catalog_item_id?: string
          created_at?: string
          id?: string
          is_confirmed_present?: boolean
          notes?: string | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epi_monthly_ack_items_ack_id_fkey"
            columns: ["ack_id"]
            isOneToOne: false
            referencedRelation: "epi_monthly_acknowledgements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_monthly_ack_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "epi_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_monthly_ack_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_monthly_acknowledgements: {
        Row: {
          agency_id: string
          created_at: string
          generated_at: string
          id: string
          month: string
          n1_signature_ip: string | null
          n1_signature_ua: string | null
          n2_signer_id: string | null
          pdf_path: string | null
          signed_by_n1_at: string | null
          signed_by_n2_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          generated_at?: string
          id?: string
          month: string
          n1_signature_ip?: string | null
          n1_signature_ua?: string | null
          n2_signer_id?: string | null
          pdf_path?: string | null
          signed_by_n1_at?: string | null
          signed_by_n2_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          month?: string
          n1_signature_ip?: string | null
          n1_signature_ua?: string | null
          n2_signer_id?: string | null
          pdf_path?: string | null
          signed_by_n1_at?: string | null
          signed_by_n2_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_monthly_acknowledgements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_monthly_acknowledgements_n2_signer_id_fkey"
            columns: ["n2_signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_monthly_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_notifications: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          read_at: string | null
          recipient_id: string
          related_ack_id: string | null
          related_assignment_id: string | null
          related_request_id: string | null
          seen_at: string | null
          seen_by_recipient: boolean
          sender_id: string
          title: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: string
          read_at?: string | null
          recipient_id: string
          related_ack_id?: string | null
          related_assignment_id?: string | null
          related_request_id?: string | null
          seen_at?: string | null
          seen_by_recipient?: boolean
          sender_id: string
          title: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          related_ack_id?: string | null
          related_assignment_id?: string | null
          related_request_id?: string | null
          seen_at?: string | null
          seen_by_recipient?: boolean
          sender_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_notifications_related_ack_id_fkey"
            columns: ["related_ack_id"]
            isOneToOne: false
            referencedRelation: "epi_monthly_acknowledgements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_notifications_related_assignment_id_fkey"
            columns: ["related_assignment_id"]
            isOneToOne: false
            referencedRelation: "epi_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "epi_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_requests: {
        Row: {
          agency_id: string
          catalog_item_id: string
          created_at: string
          fulfilled_at: string | null
          id: string
          notes: string | null
          priority: string
          reason: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          seen_by_manager_at: string | null
          seen_by_manager_id: string | null
          size: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          catalog_item_id: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reason: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          seen_by_manager_at?: string | null
          seen_by_manager_id?: string | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          catalog_item_id?: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reason?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          seen_by_manager_at?: string | null
          seen_by_manager_id?: string | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_requests_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_requests_seen_by_manager_id_fkey"
            columns: ["seen_by_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_stock: {
        Row: {
          agency_id: string
          catalog_item_id: string
          created_at: string
          id: string
          location: string | null
          quantity: number
          reorder_threshold: number | null
          size: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          catalog_item_id: string
          created_at?: string
          id?: string
          location?: string | null
          quantity?: number
          reorder_threshold?: number | null
          size?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          catalog_item_id?: string
          created_at?: string
          id?: string
          location?: string | null
          quantity?: number
          reorder_threshold?: number | null
          size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_stock_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_stock_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inventory: {
        Row: {
          agency_id: string
          assigned_to_collaborator_id: string | null
          brand: string | null
          category: Database["public"]["Enums"]["equipment_category"]
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to_collaborator_id?: string | null
          brand?: string | null
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to_collaborator_id?: string | null
          brand?: string | null
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_assigned_to_collaborator_id_fkey"
            columns: ["assigned_to_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      flow_blocks: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          schema: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string | null
          id: string
          is_active?: boolean
          name: string
          schema?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flow_schema_versions: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          json: Json
          published_at: string | null
          published_by: string | null
          schema_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          json?: Json
          published_at?: string | null
          published_by?: string | null
          schema_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          json?: Json
          published_at?: string | null
          published_by?: string | null
          schema_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_schema_versions_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "flow_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_schemas: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          domain: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_submissions: {
        Row: {
          agency_id: string | null
          client_operation_id: string
          created_at: string
          flow_id: string
          flow_version: number
          id: string
          rdv_id: string
          result_json: Json
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          agency_id?: string | null
          client_operation_id: string
          created_at?: string
          flow_id: string
          flow_version: number
          id?: string
          rdv_id: string
          result_json?: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          agency_id?: string | null
          client_operation_id?: string
          created_at?: string
          flow_id?: string
          flow_version?: number
          id?: string
          rdv_id?: string
          result_json?: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_submissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_submissions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow_schemas"
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
          created_at: string | null
          date: string
          id: string
          name: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
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
          context_type: Database["public"]["Enums"]["rag_context_type"] | null
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
          context_type?: Database["public"]["Enums"]["rag_context_type"] | null
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
          context_type?: Database["public"]["Enums"]["rag_context_type"] | null
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
      live_support_messages_archive: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string | null
          id: string | null
          is_from_support: boolean | null
          sender_id: string | null
          sender_name: string | null
          session_id: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_from_support?: boolean | null
          sender_id?: string | null
          sender_name?: string | null
          session_id?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_from_support?: boolean | null
          sender_id?: string | null
          sender_name?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      live_support_sessions_archive: {
        Row: {
          agency_slug: string | null
          agent_id: string | null
          agent_name: string | null
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          created_at: string | null
          id: string | null
          notified_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          agency_slug?: string | null
          agent_id?: string | null
          agent_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string | null
          id?: string | null
          notified_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          agency_slug?: string | null
          agent_id?: string | null
          agent_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string | null
          id?: string | null
          notified_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
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
      media_assets: {
        Row: {
          agency_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          storage_bucket: string
          storage_path: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_bucket: string
          storage_path: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_bucket?: string
          storage_path?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          access_scope: Database["public"]["Enums"]["media_access_scope"]
          agency_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          entity_id: string | null
          entity_type: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["media_access_scope"]
          agency_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["media_access_scope"]
          agency_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_links: {
        Row: {
          agency_id: string
          asset_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          folder_id: string
          id: string
          label: string | null
          sort_order: number | null
          source_id: string | null
          source_module: string | null
          source_table: string | null
        }
        Insert: {
          agency_id: string
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          folder_id: string
          id?: string
          label?: string | null
          sort_order?: number | null
          source_id?: string | null
          source_module?: string | null
          source_table?: string | null
        }
        Update: {
          agency_id?: string
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          folder_id?: string
          id?: string
          label?: string | null
          sort_order?: number | null
          source_id?: string | null
          source_module?: string | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_system_folders: {
        Row: {
          access_scope: Database["public"]["Enums"]["media_access_scope"]
          color: string
          created_at: string | null
          description: string | null
          display_label: string
          icon: string
          id: string
          path_slug: string
          sort_order: number | null
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["media_access_scope"]
          color?: string
          created_at?: string | null
          description?: string | null
          display_label: string
          icon?: string
          id?: string
          path_slug: string
          sort_order?: number | null
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["media_access_scope"]
          color?: string
          created_at?: string | null
          description?: string | null
          display_label?: string
          icon?: string
          id?: string
          path_slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      media_system_routes: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          module_key: string
          priority: number | null
          route_template: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          module_key: string
          priority?: number | null
          route_template: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          module_key?: string
          priority?: number | null
          route_template?: string
        }
        Relationships: []
      }
      metrics_apporteur_daily: {
        Row: {
          agence_id: string
          apporteur_id: string
          ca_ht: number
          date: string
          delai_devis_vers_signature_avg_days: number | null
          delai_dossier_vers_devis_avg_days: number | null
          delai_signature_vers_facture_avg_days: number | null
          devis_non_signes_count: number
          devis_signed_count: number
          devis_total_count: number
          dossiers_closed_count: number
          dossiers_received_count: number
          dossiers_sans_devis_count: number
          factures_count: number
          panier_moyen: number | null
          taux_transfo_devis: number | null
        }
        Insert: {
          agence_id: string
          apporteur_id: string
          ca_ht?: number
          date: string
          delai_devis_vers_signature_avg_days?: number | null
          delai_dossier_vers_devis_avg_days?: number | null
          delai_signature_vers_facture_avg_days?: number | null
          devis_non_signes_count?: number
          devis_signed_count?: number
          devis_total_count?: number
          dossiers_closed_count?: number
          dossiers_received_count?: number
          dossiers_sans_devis_count?: number
          factures_count?: number
          panier_moyen?: number | null
          taux_transfo_devis?: number | null
        }
        Update: {
          agence_id?: string
          apporteur_id?: string
          ca_ht?: number
          date?: string
          delai_devis_vers_signature_avg_days?: number | null
          delai_dossier_vers_devis_avg_days?: number | null
          delai_signature_vers_facture_avg_days?: number | null
          devis_non_signes_count?: number
          devis_signed_count?: number
          devis_total_count?: number
          dossiers_closed_count?: number
          dossiers_received_count?: number
          dossiers_sans_devis_count?: number
          factures_count?: number
          panier_moyen?: number | null
          taux_transfo_devis?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_apporteur_daily_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_apporteur_univers_daily: {
        Row: {
          agence_id: string
          apporteur_id: string
          ca_ht: number | null
          date: string
          devis_count: number
          dossiers_count: number
          factures_count: number
          univers_code: string
        }
        Insert: {
          agence_id: string
          apporteur_id: string
          ca_ht?: number | null
          date: string
          devis_count?: number
          dossiers_count?: number
          factures_count?: number
          univers_code: string
        }
        Update: {
          agence_id?: string
          apporteur_id?: string
          ca_ht?: number | null
          date?: string
          devis_count?: number
          dossiers_count?: number
          factures_count?: number
          univers_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_apporteur_univers_daily_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
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
      module_registry: {
        Row: {
          is_deployed: boolean
          key: string
          label: string
          min_role: number
          node_type: string
          parent_key: string | null
          required_plan: string
          sort_order: number
        }
        Insert: {
          is_deployed?: boolean
          key: string
          label: string
          min_role?: number
          node_type: string
          parent_key?: string | null
          required_plan?: string
          sort_order?: number
        }
        Update: {
          is_deployed?: boolean
          key?: string
          label?: string
          min_role?: number
          node_type?: string
          parent_key?: string | null
          required_plan?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_registry_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["key"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          agency_id: string
          created_at: string | null
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metrics_snapshot: Json | null
          month: number
          status: string | null
          year: number
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metrics_snapshot?: Json | null
          month: number
          status?: string | null
          year: number
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metrics_snapshot?: Json | null
          month?: number
          status?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operia_blocks: {
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
          show_title_on_card: boolean | null
          slug: string
          summary: string | null
          target_roles: string[] | null
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
          show_title_on_card?: boolean | null
          slug: string
          summary?: string | null
          target_roles?: string[] | null
          tips_type?: string | null
          title: string
          type?: string
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
          show_title_on_card?: boolean | null
          slug?: string
          summary?: string | null
          target_roles?: string[] | null
          tips_type?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operia_blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "operia_blocks"
            referencedColumns: ["id"]
          },
        ]
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
      pending_registrations: {
        Row: {
          agency_name: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          agency_name?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          agency_name?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
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
      planning_moves: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          input_json: Json
          moves_json: Json
          requested_by: string | null
          summary_gains_json: Json | null
          week_start: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          input_json: Json
          moves_json: Json
          requested_by?: string | null
          summary_gains_json?: Json | null
          week_start: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          input_json?: Json
          moves_json?: Json
          requested_by?: string | null
          summary_gains_json?: Json | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_moves_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_optimizer_config: {
        Row: {
          agency_id: string
          hard_constraints: Json | null
          id: string
          updated_at: string | null
          weights: Json | null
        }
        Insert: {
          agency_id: string
          hard_constraints?: Json | null
          id?: string
          updated_at?: string | null
          weights?: Json | null
        }
        Update: {
          agency_id?: string
          hard_constraints?: Json | null
          id?: string
          updated_at?: string | null
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_optimizer_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_package_recipients: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          package_id: string
          signed_at: string | null
          signed_comment: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          package_id: string
          signed_at?: string | null
          signed_comment?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          package_id?: string
          signed_at?: string | null
          signed_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_package_recipients_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_package_recipients_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "planning_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_packages: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          sent_at: string
          sent_by: string
          title: string | null
          week_start: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          sent_at?: string
          sent_by: string
          title?: string | null
          week_start: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          sent_at?: string
          sent_by?: string
          title?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_packages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_suggestions: {
        Row: {
          agency_id: string
          created_at: string | null
          dossier_id: number
          id: string
          input_json: Json
          output_json: Json
          requested_by: string | null
          score_breakdown_json: Json | null
          status: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          dossier_id: number
          id?: string
          input_json: Json
          output_json: Json
          requested_by?: string | null
          score_breakdown_json?: Json | null
          status?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          dossier_id?: number
          id?: string
          input_json?: Json
          output_json?: Json
          requested_by?: string | null
          score_breakdown_json?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_suggestions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
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
          is_read_only: boolean
          is_salaried_manager: boolean | null
          last_name: string | null
          must_change_password: boolean | null
          onboarding_completed_at: string | null
          onboarding_dismissed_until: string | null
          onboarding_payload: Json
          onboarding_version: number
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
          is_read_only?: boolean
          is_salaried_manager?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed_until?: string | null
          onboarding_payload?: Json
          onboarding_version?: number
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
          is_read_only?: boolean
          is_salaried_manager?: boolean | null
          last_name?: string | null
          must_change_password?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed_until?: string | null
          onboarding_payload?: Json
          onboarding_version?: number
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
      project_cost_documents: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          extracted_data_json: Json | null
          extracted_date: string | null
          extracted_ht: number | null
          extracted_supplier: string | null
          extracted_ttc: number | null
          extracted_vat: number | null
          extraction_status: Database["public"]["Enums"]["extraction_status_type"]
          file_path: string
          id: string
          linked_cost_id: string | null
          project_id: string
          validation_status: Database["public"]["Enums"]["validation_status_type"]
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          extracted_data_json?: Json | null
          extracted_date?: string | null
          extracted_ht?: number | null
          extracted_supplier?: string | null
          extracted_ttc?: number | null
          extracted_vat?: number | null
          extraction_status?: Database["public"]["Enums"]["extraction_status_type"]
          file_path: string
          id?: string
          linked_cost_id?: string | null
          project_id: string
          validation_status?: Database["public"]["Enums"]["validation_status_type"]
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          extracted_data_json?: Json | null
          extracted_date?: string | null
          extracted_ht?: number | null
          extracted_supplier?: string | null
          extracted_ttc?: number | null
          extracted_vat?: number | null
          extraction_status?: Database["public"]["Enums"]["extraction_status_type"]
          file_path?: string
          id?: string
          linked_cost_id?: string | null
          project_id?: string
          validation_status?: Database["public"]["Enums"]["validation_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_documents_linked_cost_id_fkey"
            columns: ["linked_cost_id"]
            isOneToOne: false
            referencedRelation: "project_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_costs: {
        Row: {
          agency_id: string
          amount_ht: number
          amount_ttc: number
          cost_date: string | null
          cost_type: Database["public"]["Enums"]["project_cost_type"]
          created_at: string
          created_by: string | null
          description: string | null
          document_path: string | null
          extracted_data_json: Json | null
          id: string
          project_id: string
          source: Database["public"]["Enums"]["cost_input_source"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status: Database["public"]["Enums"]["cost_validation_type"]
          vat_rate: number | null
        }
        Insert: {
          agency_id: string
          amount_ht?: number
          amount_ttc?: number
          cost_date?: string | null
          cost_type: Database["public"]["Enums"]["project_cost_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_path?: string | null
          extracted_data_json?: Json | null
          id?: string
          project_id: string
          source?: Database["public"]["Enums"]["cost_input_source"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
          vat_rate?: number | null
        }
        Update: {
          agency_id?: string
          amount_ht?: number
          amount_ttc?: number
          cost_date?: string | null
          cost_type?: Database["public"]["Enums"]["project_cost_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_path?: string | null
          extracted_data_json?: Json | null
          id?: string
          project_id?: string
          source?: Database["public"]["Enums"]["cost_input_source"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_profitability_snapshots: {
        Row: {
          agency_id: string
          apogee_data_hash: string | null
          apogee_last_sync_at: string | null
          ca_collected_ttc: number
          ca_invoiced_ht: number
          completeness_score: number
          computed_at: string
          cost_labor: number
          cost_other: number
          cost_overhead: number
          cost_purchases: number
          cost_subcontracting: number
          cost_total: number
          created_at: string
          created_by: string | null
          flags_json: Json | null
          gross_margin: number
          hours_total: number
          id: string
          margin_pct: number | null
          net_margin: number
          previous_snapshot_id: string | null
          project_id: string
          reliability_level: Database["public"]["Enums"]["reliability_level_type"]
          validated_at: string | null
          validated_by: string | null
          validation_status: Database["public"]["Enums"]["cost_validation_type"]
          version: number
        }
        Insert: {
          agency_id: string
          apogee_data_hash?: string | null
          apogee_last_sync_at?: string | null
          ca_collected_ttc?: number
          ca_invoiced_ht?: number
          completeness_score?: number
          computed_at?: string
          cost_labor?: number
          cost_other?: number
          cost_overhead?: number
          cost_purchases?: number
          cost_subcontracting?: number
          cost_total?: number
          created_at?: string
          created_by?: string | null
          flags_json?: Json | null
          gross_margin?: number
          hours_total?: number
          id?: string
          margin_pct?: number | null
          net_margin?: number
          previous_snapshot_id?: string | null
          project_id: string
          reliability_level?: Database["public"]["Enums"]["reliability_level_type"]
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
          version?: number
        }
        Update: {
          agency_id?: string
          apogee_data_hash?: string | null
          apogee_last_sync_at?: string | null
          ca_collected_ttc?: number
          ca_invoiced_ht?: number
          completeness_score?: number
          computed_at?: string
          cost_labor?: number
          cost_other?: number
          cost_overhead?: number
          cost_purchases?: number
          cost_subcontracting?: number
          cost_total?: number
          created_at?: string
          created_by?: string | null
          flags_json?: Json | null
          gross_margin?: number
          hours_total?: number
          id?: string
          margin_pct?: number | null
          net_margin?: number
          previous_snapshot_id?: string | null
          project_id?: string
          reliability_level?: Database["public"]["Enums"]["reliability_level_type"]
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["cost_validation_type"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_profitability_snapshots_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_profitability_snapshots_previous_snapshot_id_fkey"
            columns: ["previous_snapshot_id"]
            isOneToOne: false
            referencedRelation: "project_profitability_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_cards: {
        Row: {
          adresse: string | null
          agency_id: string
          chiffre_affaire: string | null
          code_postal: string | null
          created_at: string
          denomination: string
          enseigne: string | null
          id: string
          last_contact_at: string | null
          next_rdv_at: string | null
          notes: string | null
          owner_user_id: string | null
          pool_prospect_id: string | null
          representant: string | null
          score: number | null
          siren: string | null
          siret: string | null
          site_web: string | null
          status: string
          tags: string[] | null
          telephone: string | null
          tranche_effectif: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          agency_id: string
          chiffre_affaire?: string | null
          code_postal?: string | null
          created_at?: string
          denomination: string
          enseigne?: string | null
          id?: string
          last_contact_at?: string | null
          next_rdv_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          pool_prospect_id?: string | null
          representant?: string | null
          score?: number | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          status?: string
          tags?: string[] | null
          telephone?: string | null
          tranche_effectif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          agency_id?: string
          chiffre_affaire?: string | null
          code_postal?: string | null
          created_at?: string
          denomination?: string
          enseigne?: string | null
          id?: string
          last_contact_at?: string | null
          next_rdv_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          pool_prospect_id?: string | null
          representant?: string | null
          score?: number | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          status?: string
          tags?: string[] | null
          telephone?: string | null
          tranche_effectif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_cards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_cards_pool_prospect_id_fkey"
            columns: ["pool_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospect_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interactions: {
        Row: {
          agency_id: string
          card_id: string
          created_at: string
          id: string
          interaction_at: string
          interaction_type: string
          next_action: string | null
          next_action_at: string | null
          summary: string | null
          user_id: string | null
        }
        Insert: {
          agency_id: string
          card_id: string
          created_at?: string
          id?: string
          interaction_at?: string
          interaction_type: string
          next_action?: string | null
          next_action_at?: string | null
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          card_id?: string
          created_at?: string
          id?: string
          interaction_at?: string
          interaction_type?: string
          next_action?: string | null
          next_action_at?: string | null
          summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_interactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "prospect_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_pool: {
        Row: {
          activite_principale: string | null
          adresse: string | null
          agency_id: string
          categorie_juridique: string | null
          chiffre_affaire: string | null
          code_ape: string | null
          code_postal: string | null
          coordonnees: string | null
          date_cloture_exercice: string | null
          date_creation_etablissement: string | null
          denomination: string | null
          denomination_unite_legale: string | null
          enseigne: string | null
          id: string
          import_batch_id: string
          imported_at: string
          imported_by: string | null
          latitude: number | null
          longitude: number | null
          nb_etablissements: number | null
          representant: string | null
          siren: string | null
          siret: string | null
          site_web: string | null
          telephone: string | null
          tranche_effectif: string | null
          ville: string | null
        }
        Insert: {
          activite_principale?: string | null
          adresse?: string | null
          agency_id: string
          categorie_juridique?: string | null
          chiffre_affaire?: string | null
          code_ape?: string | null
          code_postal?: string | null
          coordonnees?: string | null
          date_cloture_exercice?: string | null
          date_creation_etablissement?: string | null
          denomination?: string | null
          denomination_unite_legale?: string | null
          enseigne?: string | null
          id?: string
          import_batch_id: string
          imported_at?: string
          imported_by?: string | null
          latitude?: number | null
          longitude?: number | null
          nb_etablissements?: number | null
          representant?: string | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          telephone?: string | null
          tranche_effectif?: string | null
          ville?: string | null
        }
        Update: {
          activite_principale?: string | null
          adresse?: string | null
          agency_id?: string
          categorie_juridique?: string | null
          chiffre_affaire?: string | null
          code_ape?: string | null
          code_postal?: string | null
          coordonnees?: string | null
          date_cloture_exercice?: string | null
          date_creation_etablissement?: string | null
          denomination?: string | null
          denomination_unite_legale?: string | null
          enseigne?: string | null
          id?: string
          import_batch_id?: string
          imported_at?: string
          imported_by?: string | null
          latitude?: number | null
          longitude?: number | null
          nb_etablissements?: number | null
          representant?: string | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          telephone?: string | null
          tranche_effectif?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_pool_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_followups: {
        Row: {
          agency_id: string
          apporteur_id: string
          apporteur_name: string
          created_at: string
          id: string
          last_meeting_at: string | null
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          apporteur_id: string
          apporteur_name?: string
          created_at?: string
          id?: string
          last_meeting_at?: string | null
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          apporteur_id?: string
          apporteur_name?: string
          created_at?: string
          id?: string
          last_meeting_at?: string | null
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_followups_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_followups_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_meetings: {
        Row: {
          agency_id: string
          apporteur_id: string
          apporteur_name: string
          created_at: string
          followup_id: string | null
          id: string
          meeting_at: string
          meeting_type: string
          outcomes: string | null
          owner_user_id: string
          summary: string | null
        }
        Insert: {
          agency_id: string
          apporteur_id: string
          apporteur_name?: string
          created_at?: string
          followup_id?: string | null
          id?: string
          meeting_at: string
          meeting_type?: string
          outcomes?: string | null
          owner_user_id: string
          summary?: string | null
        }
        Update: {
          agency_id?: string
          apporteur_id?: string
          apporteur_name?: string
          created_at?: string
          followup_id?: string | null
          id?: string
          meeting_at?: string
          meeting_type?: string
          outcomes?: string | null
          owner_user_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_meetings_followup_id_fkey"
            columns: ["followup_id"]
            isOneToOne: false
            referencedRelation: "prospecting_followups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_meetings_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protected_user_access: {
        Row: {
          access_type: string
          created_by: string | null
          id: string
          is_locked: boolean | null
          notes: string | null
          original_modules: Json | null
          snapshot_at: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          notes?: string | null
          original_modules?: Json | null
          snapshot_at?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          notes?: string | null
          original_modules?: Json | null
          snapshot_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      realisation_activity_log: {
        Row: {
          action_payload: Json
          action_type: string
          actor_label: string | null
          actor_type: string
          actor_user_id: string | null
          agency_id: string
          created_at: string
          id: string
          realisation_id: string | null
        }
        Insert: {
          action_payload?: Json
          action_type: string
          actor_label?: string | null
          actor_type?: string
          actor_user_id?: string | null
          agency_id: string
          created_at?: string
          id?: string
          realisation_id?: string | null
        }
        Update: {
          action_payload?: Json
          action_type?: string
          actor_label?: string | null
          actor_type?: string
          actor_user_id?: string | null
          agency_id?: string
          created_at?: string
          id?: string
          realisation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realisation_activity_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realisation_activity_log_realisation_id_fkey"
            columns: ["realisation_id"]
            isOneToOne: false
            referencedRelation: "realisations"
            referencedColumns: ["id"]
          },
        ]
      }
      realisation_media: {
        Row: {
          agency_id: string
          alt_text: string | null
          caption: string | null
          created_at: string
          exif_taken_at: string | null
          file_name: string
          file_size_bytes: number | null
          height: number | null
          id: string
          media_role: string
          media_type: string
          mime_type: string
          original_file_name: string | null
          realisation_id: string
          sequence_order: number
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          agency_id: string
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          exif_taken_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_role?: string
          media_type?: string
          mime_type?: string
          original_file_name?: string | null
          realisation_id: string
          sequence_order?: number
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          agency_id?: string
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          exif_taken_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_role?: string
          media_type?: string
          mime_type?: string
          original_file_name?: string | null
          realisation_id?: string
          sequence_order?: number
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "realisation_media_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realisation_media_realisation_id_fkey"
            columns: ["realisation_id"]
            isOneToOne: false
            referencedRelation: "realisations"
            referencedColumns: ["id"]
          },
        ]
      }
      realisations: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          external_sync_error: string | null
          external_sync_last_at: string | null
          external_sync_status: string
          id: string
          intervention_date: string
          published_article_id: string | null
          published_article_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          external_sync_error?: string | null
          external_sync_last_at?: string | null
          external_sync_status?: string
          id?: string
          intervention_date?: string
          published_article_id?: string | null
          published_article_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          external_sync_error?: string | null
          external_sync_last_at?: string | null
          external_sync_status?: string
          id?: string
          intervention_date?: string
          published_article_id?: string | null
          published_article_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "realisations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_settings: {
        Row: {
          agency_id: string | null
          auto_email: boolean | null
          ca_format: string | null
          comparison_period: string | null
          created_at: string | null
          custom_note: string | null
          enabled_sections: Json | null
          extra_emails: string[] | null
          generation_day: number | null
          generation_hour: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          auto_email?: boolean | null
          ca_format?: string | null
          comparison_period?: string | null
          created_at?: string | null
          custom_note?: string | null
          enabled_sections?: Json | null
          extra_emails?: string[] | null
          generation_day?: number | null
          generation_hour?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          auto_email?: boolean | null
          ca_format?: string | null
          comparison_period?: string | null
          created_at?: string | null
          custom_note?: string | null
          enabled_sections?: Json | null
          extra_emails?: string[] | null
          generation_day?: number | null
          generation_hour?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
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
      rh_meetings: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          meeting_date: string
          presentation_file_path: string | null
          presentation_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meeting_date: string
          presentation_file_path?: string | null
          presentation_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meeting_date?: string
          presentation_file_path?: string | null
          presentation_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_meetings_created_by_fkey"
            columns: ["created_by"]
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
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          decision_comment: string | null
          employee_can_download: boolean | null
          employee_user_id: string
          generated_letter_file_name: string | null
          generated_letter_path: string | null
          id: string
          payload: Json | null
          processing_info: Json | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          seen_at: string | null
          seen_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          decision_comment?: string | null
          employee_can_download?: boolean | null
          employee_user_id: string
          generated_letter_file_name?: string | null
          generated_letter_path?: string | null
          id?: string
          payload?: Json | null
          processing_info?: Json | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seen_at?: string | null
          seen_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          decision_comment?: string | null
          employee_can_download?: boolean | null
          employee_user_id?: string
          generated_letter_file_name?: string | null
          generated_letter_path?: string | null
          id?: string
          payload?: Json | null
          processing_info?: Json | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seen_at?: string | null
          seen_by?: string | null
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
          {
            foreignKeyName: "rh_requests_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_requests_seen_by_fkey"
            columns: ["seen_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      salary_access_audit: {
        Row: {
          accessed_at: string
          action: string
          agency_id: string | null
          contract_id: string | null
          employee_user_id: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          agency_id?: string | null
          contract_id?: string | null
          employee_user_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          agency_id?: string | null
          contract_id?: string | null
          employee_user_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
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
      sav_validations: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          intervention_id: string
          is_valid_sav: boolean
          updated_at: string
          validated_at: string
          validated_by: string | null
          validated_by_name: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          intervention_id: string
          is_valid_sav: boolean
          updated_at?: string
          validated_at?: string
          validated_by?: string | null
          validated_by_name?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          intervention_id?: string
          is_valid_sav?: boolean
          updated_at?: string
          validated_at?: string
          validated_by?: string | null
          validated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sav_validations_agency_id_fkey"
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
      signature_configs: {
        Row: {
          agency_status: string | null
          auto_mode: boolean | null
          color_palette: Json | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          region: string | null
          season: string | null
          style: string | null
          temporal_event: string | null
          theme: string | null
          typography: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_status?: string | null
          auto_mode?: boolean | null
          color_palette?: Json | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          region?: string | null
          season?: string | null
          style?: string | null
          temporal_event?: string | null
          theme?: string | null
          typography?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_status?: string | null
          auto_mode?: boolean | null
          color_palette?: Json | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          region?: string | null
          season?: string | null
          style?: string | null
          temporal_event?: string | null
          theme?: string | null
          typography?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signature_templates_registry: {
        Row: {
          base_background: string | null
          default_palette: Json | null
          font_pair: string | null
          id: string
          layout_type: string | null
          overlay_rules: Json | null
          region: string | null
        }
        Insert: {
          base_background?: string | null
          default_palette?: Json | null
          font_pair?: string | null
          id: string
          layout_type?: string | null
          overlay_rules?: Json | null
          region?: string | null
        }
        Update: {
          base_background?: string | null
          default_palette?: Json | null
          font_pair?: string | null
          id?: string
          layout_type?: string | null
          overlay_rules?: Json | null
          region?: string | null
        }
        Relationships: []
      }
      social_calendar_entries: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          platform: string
          published_at: string | null
          scheduled_for: string
          status: string
          suggestion_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform: string
          published_at?: string | null
          scheduled_for: string
          status?: string
          suggestion_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string
          suggestion_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_calendar_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_entries_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "social_content_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_entries_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_suggestions: {
        Row: {
          agency_id: string
          ai_payload: Json | null
          caption_base_fr: string
          content_angle: string | null
          created_at: string
          generation_batch_id: string | null
          hashtags: string[] | null
          id: string
          is_user_edited: boolean
          month_key: string
          platform_targets: Json
          realisation_id: string | null
          relevance_score: number | null
          source_type: string
          status: string
          suggestion_date: string
          title: string
          topic_key: string | null
          topic_type: string
          universe: string | null
          updated_at: string
          visual_type: string
          webhook_sent_at: string | null
        }
        Insert: {
          agency_id: string
          ai_payload?: Json | null
          caption_base_fr: string
          content_angle?: string | null
          created_at?: string
          generation_batch_id?: string | null
          hashtags?: string[] | null
          id?: string
          is_user_edited?: boolean
          month_key: string
          platform_targets?: Json
          realisation_id?: string | null
          relevance_score?: number | null
          source_type?: string
          status?: string
          suggestion_date: string
          title: string
          topic_key?: string | null
          topic_type: string
          universe?: string | null
          updated_at?: string
          visual_type: string
          webhook_sent_at?: string | null
        }
        Update: {
          agency_id?: string
          ai_payload?: Json | null
          caption_base_fr?: string
          content_angle?: string | null
          created_at?: string
          generation_batch_id?: string | null
          hashtags?: string[] | null
          id?: string
          is_user_edited?: boolean
          month_key?: string
          platform_targets?: Json
          realisation_id?: string | null
          relevance_score?: number | null
          source_type?: string
          status?: string
          suggestion_date?: string
          title?: string
          topic_key?: string | null
          topic_type?: string
          universe?: string | null
          updated_at?: string
          visual_type?: string
          webhook_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_content_suggestions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_variants: {
        Row: {
          agency_id: string
          caption_fr: string
          created_at: string
          cta: string | null
          format: string | null
          hashtags: string[] | null
          id: string
          platform: string
          platform_notes: string | null
          recommended_dimensions: string | null
          status: string
          suggestion_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          caption_fr: string
          created_at?: string
          cta?: string | null
          format?: string | null
          hashtags?: string[] | null
          id?: string
          platform: string
          platform_notes?: string | null
          recommended_dimensions?: string | null
          status?: string
          suggestion_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          caption_fr?: string
          created_at?: string
          cta?: string | null
          format?: string | null
          hashtags?: string[] | null
          id?: string
          platform?: string
          platform_notes?: string | null
          recommended_dimensions?: string | null
          status?: string
          suggestion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_variants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_variants_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "social_content_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_visual_assets: {
        Row: {
          agency_id: string
          created_at: string
          generation_meta: Json | null
          height: number
          id: string
          mime_type: string
          storage_path: string
          suggestion_id: string
          theme_key: string | null
          variant_id: string | null
          visual_type: string
          width: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          generation_meta?: Json | null
          height: number
          id?: string
          mime_type: string
          storage_path: string
          suggestion_id: string
          theme_key?: string | null
          variant_id?: string | null
          visual_type: string
          width: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          generation_meta?: Json | null
          height?: number
          id?: string
          mime_type?: string
          storage_path?: string
          suggestion_id?: string
          theme_key?: string | null
          variant_id?: string | null
          visual_type?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_visual_assets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_visual_assets_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "social_content_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_visual_assets_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        Relationships: []
      }
      tech_skills: {
        Row: {
          agency_id: string
          id: string
          level: number | null
          tech_apogee_id: number
          univers: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          id?: string
          level?: number | null
          tech_apogee_id: number
          univers: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          id?: string
          level?: number | null
          tech_apogee_id?: number
          univers?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_skills_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_capacity_config: {
        Row: {
          agency_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          hours_per_week: number
          id: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hours_per_week?: number
          id?: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hours_per_week?: number
          id?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_capacity_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_performance_daily: {
        Row: {
          agency_id: string
          ca_generated_ht: number
          capacity_minutes: number | null
          computed_at: string
          created_at: string
          date: string
          dossiers_closed: number
          id: string
          interventions_count: number
          sav_count: number
          source_data: Json | null
          technician_id: string
          technician_name: string | null
          time_non_productive_minutes: number
          time_productive_minutes: number
          time_total_minutes: number
        }
        Insert: {
          agency_id: string
          ca_generated_ht?: number
          capacity_minutes?: number | null
          computed_at?: string
          created_at?: string
          date: string
          dossiers_closed?: number
          id?: string
          interventions_count?: number
          sav_count?: number
          source_data?: Json | null
          technician_id: string
          technician_name?: string | null
          time_non_productive_minutes?: number
          time_productive_minutes?: number
          time_total_minutes?: number
        }
        Update: {
          agency_id?: string
          ca_generated_ht?: number
          capacity_minutes?: number | null
          computed_at?: string
          created_at?: string
          date?: string
          dossiers_closed?: number
          id?: string
          interventions_count?: number
          sav_count?: number
          source_data?: Json | null
          technician_id?: string
          technician_name?: string | null
          time_non_productive_minutes?: number
          time_productive_minutes?: number
          time_total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "technician_performance_daily_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_profile: {
        Row: {
          collaborator_id: string
          created_at: string
          day_end: string
          day_start: string
          home_base_label: string | null
          home_lat: number | null
          home_lng: number | null
          lunch_end: string
          lunch_start: string
          max_drive_minutes_per_day: number
          updated_at: string
          work_days: Json
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          day_end?: string
          day_start?: string
          home_base_label?: string | null
          home_lat?: number | null
          home_lng?: number | null
          lunch_end?: string
          lunch_start?: string
          max_drive_minutes_per_day?: number
          updated_at?: string
          work_days?: Json
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          day_end?: string
          day_start?: string
          home_base_label?: string | null
          home_lat?: number | null
          home_lng?: number | null
          lunch_end?: string
          lunch_start?: string
          max_drive_minutes_per_day?: number
          updated_at?: string
          work_days?: Json
        }
        Relationships: [
          {
            foreignKeyName: "technician_profile_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_skills: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          is_primary: boolean
          level: number
          notes: string | null
          univers_code: string
          updated_at: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          level?: number
          notes?: string | null
          univers_code: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          level?: number
          notes?: string | null
          univers_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_skills_univers_code_fkey"
            columns: ["univers_code"]
            isOneToOne: false
            referencedRelation: "univers_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      technician_weekly_schedule: {
        Row: {
          collaborator_id: string
          day_of_week: number
          id: string
          is_working: boolean
          lunch_end: string | null
          lunch_start: string | null
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          collaborator_id: string
          day_of_week: number
          id?: string
          is_working?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          collaborator_id?: string
          day_of_week?: number
          id?: string
          is_working?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_weekly_schedule_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
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
      ticket_notification_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          label: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Relationships: []
      }
      time_events: {
        Row: {
          collaborator_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          occurred_at: string
          source: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          occurred_at?: string
          source?: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          occurred_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_events_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
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
      travel_cache: {
        Row: {
          from_geohash: string
          id: string
          minutes_estimate: number
          to_geohash: string
          updated_at: string | null
        }
        Insert: {
          from_geohash: string
          id?: string
          minutes_estimate: number
          to_geohash: string
          updated_at?: string | null
        }
        Update: {
          from_geohash?: string
          id?: string
          minutes_estimate?: number
          to_geohash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unified_notifications: {
        Row: {
          action_url: string | null
          agency_id: string | null
          category: string
          created_at: string
          expires_at: string | null
          icon: string | null
          id: string
          is_pushed: boolean
          is_read: boolean
          message: string | null
          metadata: Json | null
          notification_type: string
          pushed_at: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          agency_id?: string | null
          category: string
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_pushed?: boolean
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          notification_type: string
          pushed_at?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          agency_id?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_pushed?: boolean
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          pushed_at?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      univers_catalog: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
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
      user_page_overrides: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          page_path: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_path: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_path?: string
          user_id?: string
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
      user_signature_profiles: {
        Row: {
          agency_name: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          logo_url: string | null
          phone: string
          updated_at: string | null
          user_id: string
          validated: boolean | null
          validated_at: string | null
          website: string | null
        }
        Insert: {
          agency_name: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          logo_url?: string | null
          phone: string
          updated_at?: string | null
          user_id: string
          validated?: boolean | null
          validated_at?: string | null
          website?: string | null
        }
        Update: {
          agency_name?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          logo_url?: string | null
          phone?: string
          updated_at?: string | null
          user_id?: string
          validated?: boolean | null
          validated_at?: string | null
          website?: string | null
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
      agency_financial_summary: {
        Row: {
          achats: number | null
          agency_id: string | null
          aides_emploi: number | null
          ca_net: number | null
          ca_total: number | null
          charges_agence: number | null
          charges_autres: number | null
          charges_externes: number | null
          charges_fixes: number | null
          charges_location: number | null
          charges_patronales_franchise: number | null
          charges_patronales_improductifs: number | null
          charges_patronales_intervenants: number | null
          charges_variables: number | null
          frais_franchise: number | null
          frais_personnel_improductifs: number | null
          frais_personnel_intervenants: number | null
          heures_facturees: number | null
          id: string | null
          locked_at: string | null
          marge_brute: number | null
          marge_contributive: number | null
          marge_sur_achats: number | null
          masse_salariale_productifs: number | null
          month: number | null
          month_date: string | null
          nb_factures: number | null
          nb_heures_payees_improductifs: number | null
          nb_heures_payees_productifs: number | null
          nb_interventions: number | null
          nb_salaries: number | null
          resultat_avant_is: number | null
          resultat_exploitation: number | null
          salaires_brut_franchise: number | null
          salaires_brut_improductifs: number | null
          salaires_brut_intervenants: number | null
          sous_traitance: number | null
          sync_version: number | null
          synced_at: string | null
          taux_marge_achats: number | null
          taux_marge_brute: number | null
          total_charges: number | null
          total_charges_hors_ms_productifs: number | null
          total_improductifs: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_financial_months_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "apogee_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_generate_monthly_epi_acks: { Args: never; Returns: number }
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
      can_access_folder_scope: {
        Args: {
          p_scope: Database["public"]["Enums"]["media_access_scope"]
          p_user_id: string
        }
        Returns: boolean
      }
      can_insert_exchange_for_ticket: {
        Args: { p_ticket_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_media: { Args: { p_user_id: string }; Returns: boolean }
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
      cleanup_expired_apporteur_otps: { Args: never; Returns: number }
      cleanup_expired_apporteur_sessions: { Args: never; Returns: number }
      cleanup_expired_request_locks: { Args: never; Returns: number }
      create_notification: {
        Args: {
          p_action_url?: string
          p_category: string
          p_icon?: string
          p_message?: string
          p_metadata?: Json
          p_notification_type: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      ensure_collaborator_folder: {
        Args: { p_agency_id: string; p_collaborator_id: string }
        Returns: string
      }
      ensure_media_folder: {
        Args: {
          p_agency_id: string
          p_entity_id?: string
          p_entity_type?: string
          p_path: string
        }
        Returns: string
      }
      format_collaborator_folder_name: {
        Args: { p_first_name: string; p_last_name: string }
        Returns: string
      }
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
      get_collaborator_for_user: {
        Args: { p_user_id: string }
        Returns: {
          collaborator_agency_id: string
          collaborator_id: string
        }[]
      }
      get_collaborator_media_path: {
        Args: { p_collaborator_id: string; p_subfolder?: string }
        Returns: string
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
      get_effective_permission_level: {
        Args: { _scope_slug: string; _user_id: string }
        Returns: number
      }
      get_email_from_pseudo: { Args: { _pseudo: string }; Returns: string }
      get_fk_dependencies: {
        Args: never
        Returns: {
          child_table: string
          fk_column: string
          parent_table: string
          ref_column: string
        }[]
      }
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
      get_my_apporteur_agency_id: { Args: never; Returns: string }
      get_my_apporteur_id: { Args: never; Returns: string }
      get_my_apporteur_user_id: { Args: never; Returns: string }
      get_schema_ddl: { Args: never; Returns: Json }
      get_technician_capacity: {
        Args: { p_agency_id: string; p_date?: string; p_technician_id: string }
        Returns: number
      }
      get_unread_notifications_count: {
        Args: { p_user_id?: string }
        Returns: number
      }
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
      has_apogee_tickets_access: {
        Args: { _user_id: string }
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
      has_module_option_v2: {
        Args: { p_module_key: string; p_option_key: string; p_user_id: string }
        Returns: boolean
      }
      has_module_v2: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_support_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_dirigeant: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_apporteur_user: { Args: never; Returns: boolean }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
      list_public_tables: {
        Args: never
        Returns: {
          tablename: string
        }[]
      }
      lock_document_request: { Args: { p_request_id: string }; Returns: Json }
      log_activity: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_type?: Database["public"]["Enums"]["activity_actor_type"]
          p_agency_id?: string
          p_entity_id?: string
          p_entity_label?: string
          p_entity_type: string
          p_metadata?: Json
          p_module: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
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
      log_salary_access: {
        Args: {
          p_action: string
          p_agency_id?: string
          p_contract_id?: string
          p_employee_user_id?: string
          p_metadata?: Json
          p_record_id: string
          p_table_name: string
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
      mark_notifications_read: {
        Args: { p_notification_ids: string[] }
        Returns: number
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
      purge_expired_ai_cache: { Args: never; Returns: number }
      purge_expired_apporteur_sessions: { Args: never; Returns: number }
      purge_expired_rate_limits: { Args: never; Returns: number }
      purge_old_activity_logs: {
        Args: { p_retention_months?: number }
        Returns: number
      }
      purge_old_ticket_history: {
        Args: { p_retention_months?: number }
        Returns: number
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
      resolve_route_template: {
        Args: { p_context: Json; p_template: string }
        Returns: string
      }
      sanitize_path_segment: { Args: { p_input: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unlock_document_request: { Args: { p_request_id: string }; Returns: Json }
      update_financial_charge: {
        Args: {
          p_charge_id: string
          p_new_amount: number
          p_new_start_month: string
          p_notes?: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_actor_type: "user" | "apporteur" | "system" | "ai"
      apogee_ticket_role: "developer" | "tester" | "franchiseur"
      app_role: "admin" | "user" | "support" | "franchiseur"
      collaborator_role:
        | "dirigeant"
        | "assistant"
        | "technicien"
        | "commercial"
        | "associe"
        | "tete_de_reseau"
        | "externe"
        | "autre"
      cost_input_source: "manual" | "invoice_upload"
      cost_source_type: "manual" | "bulletin" | "computed"
      cost_validation_type: "draft" | "validated"
      equipment_category:
        | "electroportatif"
        | "gros_outillage"
        | "outillage_main"
        | "mesure"
        | "securite"
        | "autre"
      equipment_status: "fonctionnel" | "en_reparation" | "hs" | "perdu"
      extraction_status_type: "pending" | "parsed" | "error"
      franchiseur_role: "animateur" | "directeur" | "dg"
      global_role:
        | "base_user"
        | "franchisee_user"
        | "franchisee_admin"
        | "franchisor_user"
        | "franchisor_admin"
        | "platform_admin"
        | "superadmin"
      media_access_scope: "general" | "rh" | "rh_sensitive" | "admin"
      overhead_allocation_mode:
        | "per_project"
        | "percentage_ca"
        | "per_hour"
        | "fixed"
      overhead_cost_type:
        | "rent"
        | "vehicle"
        | "fuel"
        | "admin"
        | "software"
        | "insurance"
        | "other"
      project_cost_type:
        | "purchase"
        | "subcontract"
        | "travel"
        | "rental"
        | "misc"
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
      reliability_level_type:
        | "insufficient"
        | "low"
        | "medium"
        | "good"
        | "excellent"
      support_role: "none" | "agent" | "admin"
      system_role: "visiteur" | "utilisateur" | "support" | "admin"
      validation_status_type: "pending" | "validated" | "rejected"
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
      activity_actor_type: ["user", "apporteur", "system", "ai"],
      apogee_ticket_role: ["developer", "tester", "franchiseur"],
      app_role: ["admin", "user", "support", "franchiseur"],
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
      cost_input_source: ["manual", "invoice_upload"],
      cost_source_type: ["manual", "bulletin", "computed"],
      cost_validation_type: ["draft", "validated"],
      equipment_category: [
        "electroportatif",
        "gros_outillage",
        "outillage_main",
        "mesure",
        "securite",
        "autre",
      ],
      equipment_status: ["fonctionnel", "en_reparation", "hs", "perdu"],
      extraction_status_type: ["pending", "parsed", "error"],
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
      media_access_scope: ["general", "rh", "rh_sensitive", "admin"],
      overhead_allocation_mode: [
        "per_project",
        "percentage_ca",
        "per_hour",
        "fixed",
      ],
      overhead_cost_type: [
        "rent",
        "vehicle",
        "fuel",
        "admin",
        "software",
        "insurance",
        "other",
      ],
      project_cost_type: [
        "purchase",
        "subcontract",
        "travel",
        "rental",
        "misc",
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
      reliability_level_type: [
        "insufficient",
        "low",
        "medium",
        "good",
        "excellent",
      ],
      support_role: ["none", "agent", "admin"],
      system_role: ["visiteur", "utilisateur", "support", "admin"],
      validation_status_type: ["pending", "validated", "rejected"],
    },
  },
} as const
