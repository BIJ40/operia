
-- 1. Compétences techniciens
CREATE TABLE public.tech_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  tech_apogee_id INT NOT NULL,
  univers TEXT NOT NULL,
  level INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, tech_apogee_id, univers)
);

-- 2. Calibration durées
CREATE TABLE public.duration_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  tech_apogee_id INT NOT NULL,
  univers TEXT NOT NULL,
  planned_to_real_ratio NUMERIC DEFAULT 1.0,
  sample_size INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, tech_apogee_id, univers)
);

-- 3. Cache trajets
CREATE TABLE public.travel_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_geohash TEXT NOT NULL,
  to_geohash TEXT NOT NULL,
  minutes_estimate NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_geohash, to_geohash)
);

-- 4. Suggestions de planification
CREATE TABLE public.planning_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  dossier_id INT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  score_breakdown_json JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Moves d'optimisation semaine
CREATE TABLE public.planning_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  input_json JSONB NOT NULL,
  moves_json JSONB NOT NULL,
  summary_gains_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Config pondérations par agence
CREATE TABLE public.planning_optimizer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weights JSONB DEFAULT '{"sla":0.3,"ca":0.2,"route":0.2,"coherence":0.15,"equity":0.1,"continuity":0.05}'::jsonb,
  hard_constraints JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.tech_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duration_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_optimizer_config ENABLE ROW LEVEL SECURITY;

-- RLS policies: N2+ own agency, N5+ all
CREATE POLICY "tech_skills_select" ON public.tech_skills FOR SELECT TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "tech_skills_insert" ON public.tech_skills FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "tech_skills_update" ON public.tech_skills FOR UPDATE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "tech_skills_delete" ON public.tech_skills FOR DELETE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );

-- duration_calibration
CREATE POLICY "duration_calibration_select" ON public.duration_calibration FOR SELECT TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "duration_calibration_insert" ON public.duration_calibration FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "duration_calibration_update" ON public.duration_calibration FOR UPDATE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "duration_calibration_delete" ON public.duration_calibration FOR DELETE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );

-- travel_cache: N2+ can read/write (no agency filter, shared cache)
CREATE POLICY "travel_cache_select" ON public.travel_cache FOR SELECT TO authenticated
  USING (public.has_min_global_role(auth.uid(), 2));
CREATE POLICY "travel_cache_insert" ON public.travel_cache FOR INSERT TO authenticated
  WITH CHECK (public.has_min_global_role(auth.uid(), 2));
CREATE POLICY "travel_cache_update" ON public.travel_cache FOR UPDATE TO authenticated
  USING (public.has_min_global_role(auth.uid(), 2));

-- planning_suggestions
CREATE POLICY "planning_suggestions_select" ON public.planning_suggestions FOR SELECT TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_suggestions_insert" ON public.planning_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_suggestions_update" ON public.planning_suggestions FOR UPDATE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );

-- planning_moves
CREATE POLICY "planning_moves_select" ON public.planning_moves FOR SELECT TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_moves_insert" ON public.planning_moves FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_moves_update" ON public.planning_moves FOR UPDATE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );

-- planning_optimizer_config
CREATE POLICY "planning_optimizer_config_select" ON public.planning_optimizer_config FOR SELECT TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_optimizer_config_insert" ON public.planning_optimizer_config FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );
CREATE POLICY "planning_optimizer_config_update" ON public.planning_optimizer_config FOR UPDATE TO authenticated
  USING (
    public.has_min_global_role(auth.uid(), 5)
    OR (public.has_min_global_role(auth.uid(), 2) AND agency_id = public.get_user_agency_id(auth.uid()))
  );

-- updated_at triggers
CREATE TRIGGER set_tech_skills_updated_at BEFORE UPDATE ON public.tech_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_duration_calibration_updated_at BEFORE UPDATE ON public.duration_calibration
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_travel_cache_updated_at BEFORE UPDATE ON public.travel_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_planning_optimizer_config_updated_at BEFORE UPDATE ON public.planning_optimizer_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
