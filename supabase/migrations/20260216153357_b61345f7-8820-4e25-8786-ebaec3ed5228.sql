
-- ============================================================
-- MODULE PROSPECTION APPORTEURS - Tables + RLS
-- ============================================================

-- 1. metrics_apporteur_daily : métriques pré-calculées par jour
CREATE TABLE public.metrics_apporteur_daily (
  agence_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id text NOT NULL,
  date date NOT NULL,
  dossiers_received_count int NOT NULL DEFAULT 0,
  dossiers_closed_count int NOT NULL DEFAULT 0,
  devis_total_count int NOT NULL DEFAULT 0,
  devis_signed_count int NOT NULL DEFAULT 0,
  factures_count int NOT NULL DEFAULT 0,
  ca_ht numeric NOT NULL DEFAULT 0,
  panier_moyen numeric NOT NULL DEFAULT 0,
  taux_transfo_devis numeric NOT NULL DEFAULT 0,
  dossiers_sans_devis_count int NOT NULL DEFAULT 0,
  devis_non_signes_count int NOT NULL DEFAULT 0,
  delai_dossier_vers_devis_avg_days numeric,
  delai_devis_vers_signature_avg_days numeric,
  delai_signature_vers_facture_avg_days numeric,
  PRIMARY KEY (agence_id, apporteur_id, date)
);

ALTER TABLE public.metrics_apporteur_daily ENABLE ROW LEVEL SECURITY;

-- Index pour requêtes par agence + période
CREATE INDEX idx_metrics_apporteur_daily_agence_date 
  ON public.metrics_apporteur_daily (agence_id, date);

-- RLS: lecture si module prospection + même agence ou N5+
CREATE POLICY "metrics_apporteur_daily_select"
  ON public.metrics_apporteur_daily FOR SELECT
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agence_id = get_user_agency_id(auth.uid())
    )
  );

-- Pas d'INSERT/UPDATE/DELETE côté client (service_role uniquement)

-- 2. metrics_apporteur_univers_daily : ventilation par univers
CREATE TABLE public.metrics_apporteur_univers_daily (
  agence_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id text NOT NULL,
  date date NOT NULL,
  univers_code text NOT NULL,
  dossiers_count int NOT NULL DEFAULT 0,
  devis_count int NOT NULL DEFAULT 0,
  factures_count int NOT NULL DEFAULT 0,
  ca_ht numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (agence_id, apporteur_id, date, univers_code)
);

ALTER TABLE public.metrics_apporteur_univers_daily ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_metrics_univers_daily_agence_date 
  ON public.metrics_apporteur_univers_daily (agence_id, date);

CREATE POLICY "metrics_apporteur_univers_daily_select"
  ON public.metrics_apporteur_univers_daily FOR SELECT
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agence_id = get_user_agency_id(auth.uid())
    )
  );

-- 3. prospecting_followups : suivi commercial
CREATE TABLE public.prospecting_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id text NOT NULL,
  apporteur_name text NOT NULL DEFAULT '',
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'dormant')),
  next_action text,
  next_action_at timestamptz,
  last_meeting_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospecting_followups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_prospecting_followups_agency ON public.prospecting_followups (agency_id);
CREATE INDEX idx_prospecting_followups_owner ON public.prospecting_followups (owner_user_id);

-- Trigger updated_at
CREATE TRIGGER update_prospecting_followups_updated_at
  BEFORE UPDATE ON public.prospecting_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SELECT: module prospection + même agence ou N5+
CREATE POLICY "prospecting_followups_select"
  ON public.prospecting_followups FOR SELECT
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
    )
  );

-- INSERT: module prospection + owner_user_id = self
CREATE POLICY "prospecting_followups_insert"
  ON public.prospecting_followups FOR INSERT
  TO authenticated
  WITH CHECK (
    has_module_v2(auth.uid(), 'prospection')
    AND owner_user_id = auth.uid()
    AND agency_id = get_user_agency_id(auth.uid())
  );

-- UPDATE: owner ou N3+
CREATE POLICY "prospecting_followups_update"
  ON public.prospecting_followups FOR UPDATE
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
      AND (owner_user_id = auth.uid() OR has_min_global_role(auth.uid(), 3))
    )
  );

-- DELETE: owner ou N5+
CREATE POLICY "prospecting_followups_delete"
  ON public.prospecting_followups FOR DELETE
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
      AND owner_user_id = auth.uid()
    )
  );

-- 4. prospecting_meetings : historique RDV
CREATE TABLE public.prospecting_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id text NOT NULL,
  apporteur_name text NOT NULL DEFAULT '',
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_at timestamptz NOT NULL,
  meeting_type text NOT NULL DEFAULT 'call' CHECK (meeting_type IN ('call', 'onsite', 'visio')),
  summary text,
  outcomes text,
  followup_id uuid REFERENCES public.prospecting_followups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospecting_meetings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_prospecting_meetings_agency ON public.prospecting_meetings (agency_id);
CREATE INDEX idx_prospecting_meetings_followup ON public.prospecting_meetings (followup_id);

-- SELECT: module prospection + même agence ou N5+
CREATE POLICY "prospecting_meetings_select"
  ON public.prospecting_meetings FOR SELECT
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
    )
  );

-- INSERT: module prospection + owner = self
CREATE POLICY "prospecting_meetings_insert"
  ON public.prospecting_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    has_module_v2(auth.uid(), 'prospection')
    AND owner_user_id = auth.uid()
    AND agency_id = get_user_agency_id(auth.uid())
  );

-- UPDATE: owner ou N3+
CREATE POLICY "prospecting_meetings_update"
  ON public.prospecting_meetings FOR UPDATE
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
      AND (owner_user_id = auth.uid() OR has_min_global_role(auth.uid(), 3))
    )
  );

-- DELETE: owner ou N5+
CREATE POLICY "prospecting_meetings_delete"
  ON public.prospecting_meetings FOR DELETE
  TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_module_v2(auth.uid(), 'prospection')
      AND agency_id = get_user_agency_id(auth.uid())
      AND owner_user_id = auth.uid()
    )
  );
