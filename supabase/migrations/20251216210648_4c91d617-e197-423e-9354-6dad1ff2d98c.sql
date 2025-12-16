-- Table: report_settings (paramètres par agence)
CREATE TABLE public.report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  generation_day INTEGER DEFAULT 10 CHECK (generation_day BETWEEN 1 AND 28),
  generation_hour TEXT DEFAULT '08:00',
  enabled_sections JSONB DEFAULT '{
    "synthese": true,
    "ca": true,
    "techniciens": true,
    "univers": true,
    "apporteurs": true,
    "sav": true,
    "recouvrement": true,
    "devis": true,
    "interventions": true,
    "actions": true
  }'::jsonb,
  comparison_period TEXT DEFAULT 'both' CHECK (comparison_period IN ('month', 'year', 'both')),
  auto_email BOOLEAN DEFAULT true,
  extra_emails TEXT[] DEFAULT '{}',
  custom_note TEXT,
  ca_format TEXT DEFAULT 'euro' CHECK (ca_format IN ('euro', 'kilo')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id)
);

-- Table: monthly_reports (historique des rapports générés)
CREATE TABLE public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  metrics_snapshot JSONB,
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, month, year)
);

-- Enable RLS
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_settings
CREATE POLICY "N2+ can view own agency settings"
  ON public.report_settings FOR SELECT
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "N2+ can manage own agency settings"
  ON public.report_settings FOR ALL
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

CREATE POLICY "N4+ can manage all settings"
  ON public.report_settings FOR ALL
  USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- RLS policies for monthly_reports
CREATE POLICY "N2+ can view own agency reports"
  ON public.monthly_reports FOR SELECT
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "N4+ can manage all reports"
  ON public.monthly_reports FOR ALL
  USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

-- Service role insert policy (for edge functions)
CREATE POLICY "Service can insert reports"
  ON public.monthly_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update reports"
  ON public.monthly_reports FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_report_settings_updated_at
  BEFORE UPDATE ON public.report_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for monthly reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('monthly-reports', 'monthly-reports', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "N2+ can read own agency reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'monthly-reports' 
    AND (
      has_min_global_role(auth.uid(), 4)
      OR (storage.foldername(name))[1] = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
    )
  );

CREATE POLICY "Service can write reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'monthly-reports');

CREATE POLICY "Service can update reports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'monthly-reports');

CREATE POLICY "Service can delete old reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'monthly-reports' AND has_min_global_role(auth.uid(), 4));