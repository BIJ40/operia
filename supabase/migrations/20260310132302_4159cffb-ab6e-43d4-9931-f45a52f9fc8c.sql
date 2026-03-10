-- =============================================
-- Réalisations module: full schema (simplified)
-- =============================================

-- 1) Core table: realisations (title + photos + sync)
CREATE TABLE public.realisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  intervention_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- External sync
  external_sync_status text NOT NULL DEFAULT 'not_queued'
    CHECK (external_sync_status IN ('not_queued','queued','processing','generated','published','failed')),
  external_sync_last_at timestamptz,
  external_sync_error text,
  published_article_url text,
  published_article_id text
);

ALTER TABLE public.realisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view realisations of their agency"
  ON public.realisations FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert realisations for their agency"
  ON public.realisations FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update realisations of their agency"
  ON public.realisations FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete realisations of their agency"
  ON public.realisations FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_realisations_agency ON public.realisations(agency_id);

-- 2) Media table
CREATE TABLE public.realisation_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realisation_id uuid NOT NULL REFERENCES public.realisations(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  original_file_name text,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  media_role text NOT NULL DEFAULT 'before' CHECK (media_role IN ('before','during','after','cover','detail','other')),
  sequence_order int NOT NULL DEFAULT 0,
  file_size_bytes bigint,
  width int,
  height int,
  alt_text text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.realisation_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media of their agency"
  ON public.realisation_media FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert media for their agency"
  ON public.realisation_media FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete media of their agency"
  ON public.realisation_media FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_realisation_media_realisation ON public.realisation_media(realisation_id);

-- 3) Activity log
CREATE TABLE public.realisation_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  realisation_id uuid REFERENCES public.realisations(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user','system','external')),
  actor_user_id uuid,
  actor_label text,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.realisation_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity of their agency"
  ON public.realisation_activity_log FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert activity for their agency"
  ON public.realisation_activity_log FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

-- 4) Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'realisations-private',
  'realisations-private',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Agency users can upload realisation media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'realisations-private');

CREATE POLICY "Agency users can read realisation media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'realisations-private');

CREATE POLICY "Agency users can delete realisation media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'realisations-private');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_realisations_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_realisations_updated_at
  BEFORE UPDATE ON public.realisations
  FOR EACH ROW EXECUTE FUNCTION update_realisations_updated_at();

CREATE TRIGGER trg_realisation_media_updated_at
  BEFORE UPDATE ON public.realisation_media
  FOR EACH ROW EXECUTE FUNCTION update_realisations_updated_at();
