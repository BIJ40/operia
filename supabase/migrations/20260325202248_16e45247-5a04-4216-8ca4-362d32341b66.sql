
CREATE TABLE IF NOT EXISTS public.agency_performance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  productivity_optimal NUMERIC NOT NULL DEFAULT 0.65,
  productivity_warning NUMERIC NOT NULL DEFAULT 0.50,
  load_min NUMERIC NOT NULL DEFAULT 0.80,
  load_max NUMERIC NOT NULL DEFAULT 1.10,
  sav_optimal NUMERIC NOT NULL DEFAULT 0.03,
  sav_warning NUMERIC NOT NULL DEFAULT 0.08,
  default_weekly_hours NUMERIC NOT NULL DEFAULT 35,
  default_task_duration_minutes INTEGER NOT NULL DEFAULT 60,
  deduct_planning_unavailability BOOLEAN NOT NULL DEFAULT false,
  holidays JSONB NOT NULL DEFAULT '[]',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);

ALTER TABLE public.agency_performance_config ENABLE ROW LEVEL SECURITY;

-- Select: N2+ same agency OR N5+ global
CREATE POLICY "perf_config_select" ON public.agency_performance_config
  FOR SELECT TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 5)
  );

-- Insert/Update/Delete: N3+ same agency OR N5+ global
CREATE POLICY "perf_config_write" ON public.agency_performance_config
  FOR ALL TO authenticated
  USING (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 3))
    OR has_min_global_role(auth.uid(), 5)
  )
  WITH CHECK (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 3))
    OR has_min_global_role(auth.uid(), 5)
  );
