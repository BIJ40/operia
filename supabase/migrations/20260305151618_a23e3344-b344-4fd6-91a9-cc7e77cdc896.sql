
-- ============================================================================
-- 1. UNIVERS CATALOG (référentiel unique)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.univers_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.univers_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read univers_catalog"
  ON public.univers_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage univers_catalog"
  ON public.univers_catalog FOR ALL
  TO authenticated USING (public.has_min_global_role(auth.uid(), 3));

-- Seed standard universes
INSERT INTO public.univers_catalog (code, label, sort_order) VALUES
  ('plomberie', 'Plomberie', 1),
  ('electricite', 'Électricité', 2),
  ('serrurerie', 'Serrurerie', 3),
  ('vitrerie', 'Vitrerie / Miroiterie', 4),
  ('menuiserie', 'Menuiserie', 5),
  ('chauffage', 'Chauffage / CVC', 6),
  ('volet_roulant', 'Volet Roulant', 7),
  ('peinture', 'Peinture', 8),
  ('carrelage', 'Carrelage / Faïence', 9),
  ('renovation', 'Rénovation', 10),
  ('recherche_fuite', 'Recherche de Fuite', 11),
  ('multiservices', 'Multiservices', 12),
  ('pmr', 'PMR / Accessibilité', 13),
  ('platrerie', 'Plâtrerie', 14)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. TECHNICIAN SKILLS (compétences structurées)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.technician_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  univers_code text NOT NULL REFERENCES public.univers_catalog(code) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 3,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collaborator_id, univers_code)
);

ALTER TABLE public.technician_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read technician_skills for their agency"
  ON public.technician_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = technician_skills.collaborator_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "RH managers can manage technician_skills"
  ON public.technician_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = technician_skills.collaborator_id
      AND p.id = auth.uid()
      AND (public.has_min_global_role(auth.uid(), 2) OR public.has_agency_rh_role(auth.uid(), c.agency_id))
    )
  );

-- ============================================================================
-- 3. TECHNICIAN PROFILE (amplitude, jours, base)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.technician_profile (
  collaborator_id uuid PRIMARY KEY REFERENCES public.collaborators(id) ON DELETE CASCADE,
  home_base_label text DEFAULT 'Agence',
  home_lat numeric,
  home_lng numeric,
  work_days jsonb NOT NULL DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false,"sun":false}'::jsonb,
  day_start time NOT NULL DEFAULT '08:00',
  day_end time NOT NULL DEFAULT '17:30',
  lunch_start time NOT NULL DEFAULT '12:00',
  lunch_end time NOT NULL DEFAULT '13:30',
  max_drive_minutes_per_day integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technician_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read technician_profile for their agency"
  ON public.technician_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = technician_profile.collaborator_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "RH managers can manage technician_profile"
  ON public.technician_profile FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = technician_profile.collaborator_id
      AND p.id = auth.uid()
      AND (public.has_min_global_role(auth.uid(), 2) OR public.has_agency_rh_role(auth.uid(), c.agency_id))
    )
  );

-- ============================================================================
-- 4. TRAVEL CACHE (distance Haversine entre géohash)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.travel_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_geohash text NOT NULL,
  to_geohash text NOT NULL,
  minutes_estimate numeric NOT NULL,
  distance_km numeric,
  source text DEFAULT 'haversine',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_geohash, to_geohash)
);

ALTER TABLE public.travel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read travel_cache"
  ON public.travel_cache FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can manage travel_cache"
  ON public.travel_cache FOR ALL
  TO authenticated USING (public.has_min_global_role(auth.uid(), 3));

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================
CREATE TRIGGER set_univers_catalog_updated_at
  BEFORE UPDATE ON public.univers_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_technician_skills_updated_at
  BEFORE UPDATE ON public.technician_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_technician_profile_updated_at
  BEFORE UPDATE ON public.technician_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
