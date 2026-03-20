
CREATE TABLE public.user_signature_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT DEFAULT 'Directeur / Directrice',
  agency_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_signature_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own signature profile"
  ON public.user_signature_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own signature profile"
  ON public.user_signature_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own signature profile"
  ON public.user_signature_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_user_signature_profiles_updated_at
  BEFORE UPDATE ON public.user_signature_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE public.signature_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Ma signature',
  region TEXT DEFAULT 'default',
  season TEXT DEFAULT 'auto',
  temporal_event TEXT,
  agency_status TEXT DEFAULT 'ouvert',
  theme TEXT DEFAULT 'premium',
  style TEXT DEFAULT 'corporate',
  typography TEXT DEFAULT 'corporate',
  color_palette JSONB DEFAULT '{"primary":"#1B3A5C","accent":"#E8763A","text":"#1a1a1a","bg":"#ffffff"}'::jsonb,
  auto_mode BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.signature_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own signature configs"
  ON public.signature_configs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_signature_configs_updated_at
  BEFORE UPDATE ON public.signature_configs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE public.signature_templates_registry (
  id TEXT PRIMARY KEY,
  region TEXT,
  base_background TEXT,
  overlay_rules JSONB DEFAULT '[]'::jsonb,
  default_palette JSONB DEFAULT '{}'::jsonb,
  font_pair TEXT DEFAULT 'Inter, Playfair Display',
  layout_type TEXT DEFAULT 'classic'
);

ALTER TABLE public.signature_templates_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read templates"
  ON public.signature_templates_registry FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.signature_templates_registry (id, region, base_background, default_palette, font_pair, layout_type) VALUES
  ('landes', 'landes', 'linear-gradient(135deg, #1B3A5C 0%, #2D6A4F 50%, #E8763A 100%)', '{"primary":"#1B3A5C","accent":"#2D6A4F","warm":"#E8763A"}', 'Inter, Playfair Display', 'classic'),
  ('pyrenees', 'pyrenees', 'linear-gradient(135deg, #2C3E50 0%, #4A6741 50%, #8B9DC3 100%)', '{"primary":"#2C3E50","accent":"#4A6741","cool":"#8B9DC3"}', 'Inter, Playfair Display', 'classic'),
  ('paris', 'paris', 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', '{"primary":"#1a1a2e","accent":"#0f3460","gold":"#C9A96E"}', 'Inter, Cinzel', 'modern'),
  ('cote_basque', 'cote_basque', 'linear-gradient(135deg, #0077B6 0%, #00B4D8 50%, #90E0EF 100%)', '{"primary":"#0077B6","accent":"#00B4D8","light":"#90E0EF"}', 'Inter, Playfair Display', 'classic'),
  ('default', 'default', 'linear-gradient(135deg, #1B3A5C 0%, #2A5298 100%)', '{"primary":"#1B3A5C","accent":"#E8763A"}', 'Inter, Playfair Display', 'classic');

INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('commercial.signature', 'Signatures', 'commercial', 'feature', 60, true, 'PRO', 2)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
VALUES ('PRO', 'commercial.signature', true, '{}')
ON CONFLICT (tier_key, module_key) DO NOTHING;
