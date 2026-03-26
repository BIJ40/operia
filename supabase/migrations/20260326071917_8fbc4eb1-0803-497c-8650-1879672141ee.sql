-- Mirror pilot decision journal (lightweight, auto-purged)
CREATE TABLE IF NOT EXISTS public.mirror_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  module_key text NOT NULL,
  agency_id uuid REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  mode_requested text NOT NULL,
  source_used text NOT NULL,
  fallback_reason text,
  freshness_minutes numeric,
  item_count integer,
  quality_check jsonb,
  comparison_result jsonb
);

-- Index for querying recent decisions
CREATE INDEX IF NOT EXISTS idx_mirror_decision_log_module_agency 
  ON public.mirror_decision_log(module_key, agency_id, created_at DESC);

-- Auto-purge: keep only last 7 days
CREATE OR REPLACE FUNCTION public.purge_old_mirror_decisions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mirror_decision_log WHERE created_at < now() - interval '7 days';
$$;

-- RLS
ALTER TABLE public.mirror_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read mirror decisions"
  ON public.mirror_decision_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'franchiseur')
    )
  );

CREATE POLICY "System can insert mirror decisions"
  ON public.mirror_decision_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);