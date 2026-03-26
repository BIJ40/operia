
-- ============================================================
-- APOGÉE MIRROR TABLES — Shadow Data Layer
-- ============================================================

-- 1. projects_mirror
CREATE TABLE public.projects_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  ref TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- 2. interventions_mirror
CREATE TABLE public.interventions_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- 3. devis_mirror
CREATE TABLE public.devis_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- 4. factures_mirror
CREATE TABLE public.factures_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- 5. users_mirror
CREATE TABLE public.users_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- 6. clients_mirror
CREATE TABLE public.clients_mirror (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apogee_id TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'stale', 'error')),
  UNIQUE (agency_id, apogee_id)
);

-- ============================================================
-- SYNC TRACKING TABLES
-- ============================================================

-- 7. apogee_sync_runs — Global sync execution tracking
CREATE TABLE public.apogee_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  sync_type TEXT NOT NULL DEFAULT 'full' CHECK (sync_type IN ('full', 'partial', 'manual')),
  agencies_count INTEGER NOT NULL DEFAULT 0,
  records_total INTEGER NOT NULL DEFAULT 0,
  records_success INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_log JSONB DEFAULT '[]'::jsonb,
  triggered_by TEXT
);

-- 8. apogee_sync_logs — Per-agency per-endpoint detail
CREATE TABLE public.apogee_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.apogee_sync_runs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  records_fetched INTEGER DEFAULT 0,
  records_upserted INTEGER DEFAULT 0,
  error_message TEXT,
  error_detail JSONB
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_projects_mirror_agency ON public.projects_mirror(agency_id);
CREATE INDEX idx_projects_mirror_ref ON public.projects_mirror(ref);
CREATE INDEX idx_projects_mirror_synced ON public.projects_mirror(synced_at);
CREATE INDEX idx_interventions_mirror_agency ON public.interventions_mirror(agency_id);
CREATE INDEX idx_devis_mirror_agency ON public.devis_mirror(agency_id);
CREATE INDEX idx_factures_mirror_agency ON public.factures_mirror(agency_id);
CREATE INDEX idx_users_mirror_agency ON public.users_mirror(agency_id);
CREATE INDEX idx_clients_mirror_agency ON public.clients_mirror(agency_id);
CREATE INDEX idx_sync_runs_status ON public.apogee_sync_runs(status);
CREATE INDEX idx_sync_runs_started ON public.apogee_sync_runs(started_at DESC);
CREATE INDEX idx_sync_logs_run ON public.apogee_sync_logs(run_id);
CREATE INDEX idx_sync_logs_agency ON public.apogee_sync_logs(agency_id);

-- ============================================================
-- RLS — Cloisonnement par agency_id
-- ============================================================

ALTER TABLE public.projects_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_sync_logs ENABLE ROW LEVEL SECURITY;

-- Mirror tables: users can read their own agency's data
CREATE POLICY "mirror_read_own_agency" ON public.projects_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mirror_read_own_agency" ON public.interventions_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mirror_read_own_agency" ON public.devis_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mirror_read_own_agency" ON public.factures_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mirror_read_own_agency" ON public.users_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mirror_read_own_agency" ON public.clients_mirror FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- Franchiseur can read all mirror data
CREATE POLICY "mirror_read_franchiseur" ON public.projects_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "mirror_read_franchiseur" ON public.interventions_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "mirror_read_franchiseur" ON public.devis_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "mirror_read_franchiseur" ON public.factures_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "mirror_read_franchiseur" ON public.users_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "mirror_read_franchiseur" ON public.clients_mirror FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));

-- Sync tracking: only franchiseur/admin can see
CREATE POLICY "sync_runs_read_admin" ON public.apogee_sync_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));
CREATE POLICY "sync_logs_read_admin" ON public.apogee_sync_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('franchisor_user','franchisor_admin','platform_admin','superadmin')));

-- ============================================================
-- VIEW: apogee_sync_status — Freshness per agency
-- ============================================================

CREATE OR REPLACE VIEW public.apogee_sync_status WITH (security_invoker = on) AS
SELECT 
  a.id AS agency_id,
  a.label AS agency_label,
  a.slug AS agency_slug,
  lr.last_success_at,
  lr.last_status,
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
  counts.clients_count
FROM public.apogee_agencies a
LEFT JOIN LATERAL (
  SELECT 
    sl.finished_at AS last_success_at,
    sl.status AS last_status
  FROM public.apogee_sync_logs sl
  WHERE sl.agency_id = a.id AND sl.status = 'success'
  ORDER BY sl.finished_at DESC
  LIMIT 1
) lr ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT count(*) FROM public.projects_mirror WHERE agency_id = a.id) AS projects_count,
    (SELECT count(*) FROM public.interventions_mirror WHERE agency_id = a.id) AS interventions_count,
    (SELECT count(*) FROM public.factures_mirror WHERE agency_id = a.id) AS factures_count,
    (SELECT count(*) FROM public.devis_mirror WHERE agency_id = a.id) AS devis_count,
    (SELECT count(*) FROM public.users_mirror WHERE agency_id = a.id) AS users_count,
    (SELECT count(*) FROM public.clients_mirror WHERE agency_id = a.id) AS clients_count
) counts ON true
WHERE a.is_active = true;
