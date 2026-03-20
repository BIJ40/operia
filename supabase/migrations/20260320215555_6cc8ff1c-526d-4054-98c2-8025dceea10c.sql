-- BD Story Render Engine: character visuals + renders tables

CREATE TABLE IF NOT EXISTS public.bd_story_character_visuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  slug text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'technicien',
  reference_image_urls text[] DEFAULT '{}',
  visual_identity jsonb DEFAULT '{}',
  outfit_rules jsonb DEFAULT '{}',
  must_keep jsonb DEFAULT '[]',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, slug)
);

CREATE TABLE IF NOT EXISTS public.bd_story_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.bd_story_stories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  render_provider text DEFAULT 'gemini',
  style_preset text DEFAULT 'cartoon_premium',
  final_board_url text,
  panels_render jsonb DEFAULT '[]',
  render_debug jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bd_story_character_visuals_agency ON public.bd_story_character_visuals(agency_id);
CREATE INDEX idx_bd_story_renders_agency ON public.bd_story_renders(agency_id);
CREATE INDEX idx_bd_story_renders_story ON public.bd_story_renders(story_id);

ALTER TABLE public.bd_story_character_visuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_story_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_agency_char_visuals" ON public.bd_story_character_visuals
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "insert_own_agency_char_visuals" ON public.bd_story_character_visuals
  FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "update_own_agency_char_visuals" ON public.bd_story_character_visuals
  FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "select_own_agency_renders" ON public.bd_story_renders
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "insert_own_agency_renders" ON public.bd_story_renders
  FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "update_own_agency_renders" ON public.bd_story_renders
  FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER set_updated_at_char_visuals
  BEFORE UPDATE ON public.bd_story_character_visuals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_renders
  BEFORE UPDATE ON public.bd_story_renders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('bd-story-assets', 'bd-story-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_bd_story_assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bd-story-assets');
CREATE POLICY "auth_insert_bd_story_assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bd-story-assets');
CREATE POLICY "public_read_bd_story_assets" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'bd-story-assets');