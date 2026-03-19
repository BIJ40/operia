
-- ============================================================================
-- HC Social Hub — Phase 1: Tables, RLS, Indexes, Triggers, Storage
-- ============================================================================

-- ─── Helper: trigger function for updated_at ───────────────────
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Table 1: social_content_suggestions
-- ============================================================================
CREATE TABLE public.social_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  suggestion_date DATE NOT NULL,
  title TEXT NOT NULL,
  content_angle TEXT,
  caption_base_fr TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  platform_targets JSONB NOT NULL DEFAULT '[]',
  visual_type TEXT NOT NULL,
  topic_type TEXT NOT NULL CHECK (topic_type IN ('awareness_day','seasonal_tip','realisation','local_branding')),
  topic_key TEXT,
  realisation_id UUID NULL,
  universe TEXT NULL,
  relevance_score NUMERIC(5,2) NULL,
  ai_payload JSONB NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','archived')),
  generation_batch_id UUID NULL,
  source_type TEXT NOT NULL DEFAULT 'ai_seasonal' CHECK (source_type IN ('ai_awareness','ai_realisation','ai_seasonal','manual','regenerated')),
  is_user_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_content_suggestions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scs_agency_month ON social_content_suggestions(agency_id, month_key);
CREATE INDEX idx_scs_agency_date ON social_content_suggestions(agency_id, suggestion_date);
CREATE INDEX idx_scs_agency_status ON social_content_suggestions(agency_id, status);
CREATE INDEX idx_scs_realisation ON social_content_suggestions(realisation_id) WHERE realisation_id IS NOT NULL;
CREATE INDEX idx_scs_agency_batch ON social_content_suggestions(agency_id, generation_batch_id);

CREATE TRIGGER set_updated_at_scs
  BEFORE UPDATE ON social_content_suggestions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: same pattern as report_settings, prospect_pool etc.
CREATE POLICY "scs_select" ON social_content_suggestions FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "scs_insert" ON social_content_suggestions FOR INSERT TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "scs_update" ON social_content_suggestions FOR UPDATE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()))
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "scs_delete" ON social_content_suggestions FOR DELETE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

-- ============================================================================
-- Table 2: social_post_variants (with agency_id for efficient RLS)
-- ============================================================================
CREATE TABLE public.social_post_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES social_content_suggestions(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','google_business','linkedin')),
  caption_fr TEXT NOT NULL,
  cta TEXT NULL,
  hashtags TEXT[] DEFAULT '{}',
  format TEXT NULL,
  recommended_dimensions TEXT NULL,
  platform_notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(suggestion_id, platform)
);

ALTER TABLE public.social_post_variants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_spv
  BEFORE UPDATE ON social_post_variants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "spv_select" ON social_post_variants FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "spv_insert" ON social_post_variants FOR INSERT TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "spv_update" ON social_post_variants FOR UPDATE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()))
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "spv_delete" ON social_post_variants FOR DELETE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

-- ============================================================================
-- Table 3: social_visual_assets
-- ============================================================================
CREATE TABLE public.social_visual_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES social_content_suggestions(id) ON DELETE CASCADE,
  variant_id UUID NULL REFERENCES social_post_variants(id) ON DELETE SET NULL,
  visual_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  theme_key TEXT NULL,
  generation_meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_visual_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sva_select" ON social_visual_assets FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "sva_insert" ON social_visual_assets FOR INSERT TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "sva_delete" ON social_visual_assets FOR DELETE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

-- ============================================================================
-- Table 4: social_calendar_entries
-- ============================================================================
CREATE TABLE public.social_calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES social_content_suggestions(id) ON DELETE CASCADE,
  variant_id UUID NULL REFERENCES social_post_variants(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','google_business','linkedin')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','cancelled')),
  published_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sce_agency_scheduled ON social_calendar_entries(agency_id, scheduled_for);

-- Anti-duplicate: prevent scheduling same variant+platform at exact same time
CREATE UNIQUE INDEX idx_sce_unique_variant_schedule 
  ON social_calendar_entries(variant_id, platform, scheduled_for) 
  WHERE variant_id IS NOT NULL AND status != 'cancelled';

CREATE TRIGGER set_updated_at_sce
  BEFORE UPDATE ON social_calendar_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "sce_select" ON social_calendar_entries FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "sce_insert" ON social_calendar_entries FOR INSERT TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "sce_update" ON social_calendar_entries FOR UPDATE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()))
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "sce_delete" ON social_calendar_entries FOR DELETE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

-- ============================================================================
-- Storage bucket for social visuals
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('social-visuals', 'social-visuals', false, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "social_visuals_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'social-visuals');

CREATE POLICY "social_visuals_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-visuals');

CREATE POLICY "social_visuals_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'social-visuals' AND has_min_global_role(auth.uid(), 2));

-- ============================================================================
-- Module registry entry
-- ============================================================================
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('commercial.social', 'Social', 'commercial', 'feature', 50, true, 'PRO', 2)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- Activate in plan_tier_modules for PRO
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
VALUES ('PRO', 'commercial.social', true, '{}')
ON CONFLICT (tier_key, module_key) DO NOTHING;
