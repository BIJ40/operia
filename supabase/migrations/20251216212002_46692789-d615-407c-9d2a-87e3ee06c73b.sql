-- =========================
-- RAPPORT ACTIVITE - SECURITY PATCH
-- =========================

-- 1) Remove dangerous/useless "Service can..." policies
DROP POLICY IF EXISTS "Service can insert reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Service can update reports" ON public.monthly_reports;

DROP POLICY IF EXISTS "Service can write reports" ON storage.objects;
DROP POLICY IF EXISTS "Service can update reports" ON storage.objects;

-- 2) report_settings: drop old FOR ALL policies (avoid overlap)
DROP POLICY IF EXISTS "N2+ can view own agency settings" ON public.report_settings;
DROP POLICY IF EXISTS "N2+ can manage own agency settings" ON public.report_settings;
DROP POLICY IF EXISTS "N4+ can manage all settings" ON public.report_settings;

-- 2.1 SELECT: N2+ own agency OR N4+
CREATE POLICY "report_settings_select_own_or_n4"
  ON public.report_settings FOR SELECT
  USING (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 4)
  );

-- 2.2 INSERT: N2+ own agency
CREATE POLICY "report_settings_insert_own"
  ON public.report_settings FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

-- 2.3 INSERT: N4+ any agency
CREATE POLICY "report_settings_insert_n4"
  ON public.report_settings FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- 2.4 UPDATE: N2+ own agency
CREATE POLICY "report_settings_update_own"
  ON public.report_settings FOR UPDATE
  USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  )
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

-- 2.5 UPDATE: N4+ any agency
CREATE POLICY "report_settings_update_n4"
  ON public.report_settings FOR UPDATE
  USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- 2.6 DELETE: N4+ only
CREATE POLICY "report_settings_delete_n4"
  ON public.report_settings FOR DELETE
  USING (has_min_global_role(auth.uid(), 4));

-- 3) monthly_reports: drop old policies
DROP POLICY IF EXISTS "N2+ can view own agency reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "N4+ can manage all reports" ON public.monthly_reports;

-- 3.1 SELECT: N2+ own agency OR N4+
CREATE POLICY "monthly_reports_select_own_or_n4"
  ON public.monthly_reports FOR SELECT
  USING (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 4)
  );

-- 3.2 INSERT: N4+ only (humans; Edge Functions bypass RLS)
CREATE POLICY "monthly_reports_insert_n4"
  ON public.monthly_reports FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- 3.3 UPDATE: N4+ only
CREATE POLICY "monthly_reports_update_n4"
  ON public.monthly_reports FOR UPDATE
  USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- 3.4 DELETE: N4+ only
CREATE POLICY "monthly_reports_delete_n4"
  ON public.monthly_reports FOR DELETE
  USING (has_min_global_role(auth.uid(), 4));

-- 4) generation_hour validation constraint
ALTER TABLE public.report_settings
  DROP CONSTRAINT IF EXISTS generation_hour_format;

ALTER TABLE public.report_settings
  ADD CONSTRAINT generation_hour_format
  CHECK (generation_hour ~ '^\d{2}:\d{2}$');

-- 5) Indexes for efficient purge/queries
CREATE INDEX IF NOT EXISTS idx_monthly_reports_created_at
  ON public.monthly_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_agency_period
  ON public.monthly_reports(agency_id, year, month);

-- 6) Storage policies - switch to agency_id (UUID) path
DROP POLICY IF EXISTS "N2+ can read own agency reports" ON storage.objects;
DROP POLICY IF EXISTS "Service can delete old reports" ON storage.objects;

-- 6.1 SELECT: N4+ OR own agency (path starts with agency_id UUID)
CREATE POLICY "monthly_reports_storage_select_own_or_n4"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'monthly-reports'
    AND (
      has_min_global_role(auth.uid(), 4)
      OR (storage.foldername(name))[1]::uuid = get_user_agency_id(auth.uid())
    )
  );

-- 6.2 DELETE: N4+ only (humans; Edge Functions bypass)
CREATE POLICY "monthly_reports_storage_delete_n4"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'monthly-reports' AND has_min_global_role(auth.uid(), 4));