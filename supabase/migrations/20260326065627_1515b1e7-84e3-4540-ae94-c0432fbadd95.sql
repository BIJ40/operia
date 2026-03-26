
-- ============================================================
-- MIRROR HARDENING v2.1 — Per-agency key, real versioning, stale detection
-- ============================================================

-- 1. Per-agency API key reference on apogee_agencies
ALTER TABLE public.apogee_agencies 
  ADD COLUMN IF NOT EXISTS api_key_ref TEXT DEFAULT NULL;
COMMENT ON COLUMN public.apogee_agencies.api_key_ref IS 'Reference name for per-agency Apogée API key stored in Vault/secrets. NULL = use global APOGEE_API_KEY.';

-- 2. Add last_sync_run_id and mirror_status to all mirror tables
-- Also expand sync_status CHECK to include 'missing_from_source'

-- projects_mirror
ALTER TABLE public.projects_mirror DROP CONSTRAINT IF EXISTS projects_mirror_sync_status_check;
ALTER TABLE public.projects_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.projects_mirror 
  ADD CONSTRAINT projects_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_projects_mirror_run ON public.projects_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_projects_mirror_status ON public.projects_mirror(mirror_status);

-- interventions_mirror
ALTER TABLE public.interventions_mirror DROP CONSTRAINT IF EXISTS interventions_mirror_sync_status_check;
ALTER TABLE public.interventions_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.interventions_mirror 
  ADD CONSTRAINT interventions_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_interventions_mirror_run ON public.interventions_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_interventions_mirror_status ON public.interventions_mirror(mirror_status);

-- devis_mirror
ALTER TABLE public.devis_mirror DROP CONSTRAINT IF EXISTS devis_mirror_sync_status_check;
ALTER TABLE public.devis_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.devis_mirror 
  ADD CONSTRAINT devis_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_devis_mirror_run ON public.devis_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_devis_mirror_status ON public.devis_mirror(mirror_status);

-- factures_mirror
ALTER TABLE public.factures_mirror DROP CONSTRAINT IF EXISTS factures_mirror_sync_status_check;
ALTER TABLE public.factures_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.factures_mirror 
  ADD CONSTRAINT factures_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_factures_mirror_run ON public.factures_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_factures_mirror_status ON public.factures_mirror(mirror_status);

-- users_mirror
ALTER TABLE public.users_mirror DROP CONSTRAINT IF EXISTS users_mirror_sync_status_check;
ALTER TABLE public.users_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.users_mirror 
  ADD CONSTRAINT users_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_users_mirror_run ON public.users_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_users_mirror_status ON public.users_mirror(mirror_status);

-- clients_mirror
ALTER TABLE public.clients_mirror DROP CONSTRAINT IF EXISTS clients_mirror_sync_status_check;
ALTER TABLE public.clients_mirror 
  ADD COLUMN IF NOT EXISTS last_sync_run_id UUID REFERENCES public.apogee_sync_runs(id),
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE public.clients_mirror 
  ADD CONSTRAINT clients_mirror_mirror_status_check 
  CHECK (mirror_status IN ('synced', 'stale', 'missing_from_source'));
CREATE INDEX IF NOT EXISTS idx_clients_mirror_run ON public.clients_mirror(last_sync_run_id);
CREATE INDEX IF NOT EXISTS idx_clients_mirror_status ON public.clients_mirror(mirror_status);

-- 3. Enrich apogee_sync_logs with key_source and records_marked_missing
ALTER TABLE public.apogee_sync_logs 
  ADD COLUMN IF NOT EXISTS key_source TEXT DEFAULT 'global' CHECK (key_source IN ('global', 'agency')),
  ADD COLUMN IF NOT EXISTS records_marked_missing INTEGER DEFAULT 0;

-- 4. Update apogee_sync_status view to include mirror_status counts
DROP VIEW IF EXISTS public.apogee_sync_status;
CREATE OR REPLACE VIEW public.apogee_sync_status WITH (security_invoker = on) AS
SELECT 
  a.id AS agency_id,
  a.label AS agency_label,
  a.slug AS agency_slug,
  a.api_key_ref,
  lr.last_success_at,
  lr.last_status,
  lr.last_run_id,
  EXTRACT(EPOCH FROM (now() - lr.last_success_at)) / 60 AS freshness_minutes,
  CASE 
    WHEN lr.last_success_at IS NULL THEN 'never_synced'
    WHEN now() - lr.last_success_at < INTERVAL '4 hours' THEN 'fresh'
    WHEN now() - lr.last_success_at < INTERVAL '12 hours' THEN 'stale'
    ELSE 'outdated'
  END AS freshness_status,
  counts.projects_count,
  counts.interventions_count,
  counts.factures_count,
  counts.devis_count,
  counts.users_count,
  counts.clients_count,
  missing.projects_missing,
  missing.interventions_missing,
  missing.factures_missing,
  missing.devis_missing,
  missing.users_missing,
  missing.clients_missing
FROM public.apogee_agencies a
LEFT JOIN LATERAL (
  SELECT 
    sl.finished_at AS last_success_at,
    sl.status AS last_status,
    sl.run_id AS last_run_id
  FROM public.apogee_sync_logs sl
  WHERE sl.agency_id = a.id AND sl.status = 'success'
  ORDER BY sl.finished_at DESC
  LIMIT 1
) lr ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT count(*) FROM public.projects_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS projects_count,
    (SELECT count(*) FROM public.interventions_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS interventions_count,
    (SELECT count(*) FROM public.factures_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS factures_count,
    (SELECT count(*) FROM public.devis_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS devis_count,
    (SELECT count(*) FROM public.users_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS users_count,
    (SELECT count(*) FROM public.clients_mirror WHERE agency_id = a.id AND mirror_status = 'synced') AS clients_count
) counts ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT count(*) FROM public.projects_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS projects_missing,
    (SELECT count(*) FROM public.interventions_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS interventions_missing,
    (SELECT count(*) FROM public.factures_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS factures_missing,
    (SELECT count(*) FROM public.devis_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS devis_missing,
    (SELECT count(*) FROM public.users_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS users_missing,
    (SELECT count(*) FROM public.clients_mirror WHERE agency_id = a.id AND mirror_status = 'missing_from_source') AS clients_missing
) missing ON true
WHERE a.is_active = true;
