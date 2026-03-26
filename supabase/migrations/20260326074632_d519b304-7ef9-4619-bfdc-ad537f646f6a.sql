-- Table for persisting pilot metrics snapshots (survives restarts)
-- Lightweight, auto-purged after 30 days
CREATE TABLE IF NOT EXISTS public.mirror_pilot_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  module_key text NOT NULL,
  agency_id uuid NOT NULL,
  mirror_reads integer NOT NULL DEFAULT 0,
  live_reads integer NOT NULL DEFAULT 0,
  fallback_to_live integer NOT NULL DEFAULT 0,
  fallback_reasons jsonb DEFAULT '{}',
  total_items integer NOT NULL DEFAULT 0,
  comparisons_total integer NOT NULL DEFAULT 0,
  comparisons_passed integer NOT NULL DEFAULT 0,
  comparisons_failed integer NOT NULL DEFAULT 0,
  last_freshness_minutes numeric,
  last_mirror_count integer,
  verdict text,
  verdict_reasons text[]
);

ALTER TABLE public.mirror_pilot_snapshots ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can read
CREATE POLICY "Authenticated users can read pilot snapshots"
  ON public.mirror_pilot_snapshots FOR SELECT
  TO authenticated USING (true);

-- Only service role inserts (via edge function or RPC) — block direct user inserts
CREATE POLICY "No direct user inserts on pilot snapshots"
  ON public.mirror_pilot_snapshots FOR INSERT
  TO authenticated WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_mirror_pilot_snapshots_module_agency 
  ON public.mirror_pilot_snapshots (module_key, agency_id, created_at DESC);

-- Auto-purge after 30 days
CREATE OR REPLACE FUNCTION public.purge_old_pilot_snapshots()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mirror_pilot_snapshots
  WHERE created_at < now() - interval '30 days';
$$;