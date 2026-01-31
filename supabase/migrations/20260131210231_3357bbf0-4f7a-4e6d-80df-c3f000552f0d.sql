-- =============================================
-- Module Performance Terrain - Tables agrégées
-- =============================================

-- Table d'agrégation journalière des performances techniciens
CREATE TABLE public.technician_performance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL, -- ID Apogée du technicien
  technician_name TEXT, -- Nom complet pour affichage rapide
  date DATE NOT NULL,
  
  -- Temps en minutes
  time_total_minutes INTEGER NOT NULL DEFAULT 0,
  time_productive_minutes INTEGER NOT NULL DEFAULT 0,
  time_non_productive_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Compteurs
  interventions_count INTEGER NOT NULL DEFAULT 0,
  sav_count INTEGER NOT NULL DEFAULT 0,
  dossiers_closed INTEGER NOT NULL DEFAULT 0,
  
  -- CA généré
  ca_generated_ht NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Capacité contractuelle (en minutes/jour)
  capacity_minutes INTEGER DEFAULT 420, -- 7h par défaut
  
  -- Métadonnées
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_data JSONB, -- Détails des interventions agrégées
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Contrainte unique par technicien/jour/agence
  CONSTRAINT unique_tech_daily UNIQUE (agency_id, technician_id, date)
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_tech_perf_agency_date ON technician_performance_daily(agency_id, date DESC);
CREATE INDEX idx_tech_perf_technician ON technician_performance_daily(technician_id, date DESC);
CREATE INDEX idx_tech_perf_date_range ON technician_performance_daily(date);

-- Table de configuration capacité par technicien (optionnelle)
CREATE TABLE public.technician_capacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL,
  hours_per_week NUMERIC(4, 1) NOT NULL DEFAULT 35,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tech_capacity UNIQUE (agency_id, technician_id, effective_from)
);

-- Enable RLS
ALTER TABLE public.technician_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_capacity_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies - N5+ voit tout
CREATE POLICY "tech_perf_select_admin" ON public.technician_performance_daily
  FOR SELECT TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));

-- N2+ voit son agence
CREATE POLICY "tech_perf_select_agency" ON public.technician_performance_daily
  FOR SELECT TO authenticated
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_min_global_role(auth.uid(), 2)
  );

-- Insert/Update via système uniquement (pas de RLS insert pour users)
CREATE POLICY "tech_perf_insert_system" ON public.technician_performance_daily
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_global_role(auth.uid(), 5));

CREATE POLICY "tech_perf_update_system" ON public.technician_performance_daily
  FOR UPDATE TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));

-- Policies pour capacity_config
CREATE POLICY "tech_capacity_select_admin" ON public.technician_capacity_config
  FOR SELECT TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));

CREATE POLICY "tech_capacity_select_agency" ON public.technician_capacity_config
  FOR SELECT TO authenticated
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "tech_capacity_manage_agency" ON public.technician_capacity_config
  FOR ALL TO authenticated
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_min_global_role(auth.uid(), 2)
  );

-- Fonction pour récupérer la capacité d'un technicien à une date
CREATE OR REPLACE FUNCTION public.get_technician_capacity(
  p_agency_id UUID,
  p_technician_id TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (hours_per_week * 60 / 5)::INTEGER
      FROM technician_capacity_config
      WHERE agency_id = p_agency_id
        AND technician_id = p_technician_id
        AND effective_from <= p_date
        AND (effective_to IS NULL OR effective_to >= p_date)
      ORDER BY effective_from DESC
      LIMIT 1
    ),
    420 -- 7h par défaut (35h/5j)
  )
$$;

-- Trigger pour updated_at sur capacity_config
CREATE TRIGGER update_tech_capacity_updated_at
  BEFORE UPDATE ON public.technician_capacity_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();