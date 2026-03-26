
-- LOT 3 — DATA SOURCE FLAGS (progressive mirror switchover)
-- Fix: table was partially created, drop and recreate cleanly

DROP TABLE IF EXISTS public.data_source_flags;

CREATE TABLE public.data_source_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key TEXT NOT NULL,
  source_mode TEXT NOT NULL DEFAULT 'live' CHECK (source_mode IN ('live', 'mirror', 'fallback')),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  freshness_threshold_minutes INTEGER NOT NULL DEFAULT 240,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (module_key, agency_id)
);

COMMENT ON TABLE public.data_source_flags IS 'Feature flags controlling data source per module (live/mirror/fallback). NULL agency_id = global default.';

CREATE INDEX idx_dsf_module ON public.data_source_flags(module_key);
CREATE INDEX idx_dsf_agency ON public.data_source_flags(agency_id);

ALTER TABLE public.data_source_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsf_read_admin" ON public.data_source_flags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisee_admin','franchisor_user','franchisor_admin','platform_admin','superadmin')));

CREATE POLICY "dsf_write_admin" ON public.data_source_flags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('platform_admin','superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('platform_admin','superadmin')));

INSERT INTO public.data_source_flags (module_key, source_mode, agency_id, freshness_threshold_minutes) VALUES
  ('factures', 'live', NULL, 240),
  ('projects', 'live', NULL, 240),
  ('interventions', 'live', NULL, 360),
  ('devis', 'live', NULL, 360),
  ('users', 'live', NULL, 480),
  ('clients', 'live', NULL, 480);
