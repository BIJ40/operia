CREATE TABLE IF NOT EXISTS public.agency_map_zone_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  code_insee text NOT NULL,
  nom text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, code_insee)
);

ALTER TABLE public.agency_map_zone_communes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their agency zone"
  ON public.agency_map_zone_communes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage their agency zone"
  ON public.agency_map_zone_communes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_agency_map_zone_agency ON public.agency_map_zone_communes(agency_id);