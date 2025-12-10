-- P3.2: Normalisation enabled_modules vers table relationnelle
-- Table user_modules pour stockage normalisé des modules activés
CREATE TABLE IF NOT EXISTS public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  options jsonb DEFAULT '{}'::jsonb,
  enabled_at timestamptz DEFAULT now(),
  enabled_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_key)
);

-- Index pour performance
CREATE INDEX idx_user_modules_user_id ON public.user_modules(user_id);
CREATE INDEX idx_user_modules_module_key ON public.user_modules(module_key);

-- RLS
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own modules"
  ON public.user_modules FOR SELECT
  USING (user_id = auth.uid() OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "N3+ can manage modules"
  ON public.user_modules FOR ALL
  USING (has_min_global_role(auth.uid(), 3))
  WITH CHECK (has_min_global_role(auth.uid(), 3));

-- Trigger updated_at
CREATE TRIGGER update_user_modules_updated_at
  BEFORE UPDATE ON public.user_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration des données existantes depuis profiles.enabled_modules JSONB
INSERT INTO public.user_modules (user_id, module_key, options, enabled_at)
SELECT 
  p.id as user_id,
  key as module_key,
  COALESCE(value->'options', '{}'::jsonb) as options,
  now() as enabled_at
FROM public.profiles p,
LATERAL jsonb_each(COALESCE(p.enabled_modules, '{}'::jsonb)) AS modules(key, value)
WHERE (value->>'enabled')::boolean = true
ON CONFLICT (user_id, module_key) DO NOTHING;

-- Fonction helper pour vérifier si un utilisateur a un module activé (compatible avec nouvelle table)
CREATE OR REPLACE FUNCTION public.has_module_v2(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_modules
    WHERE user_id = _user_id AND module_key = _module_key
  )
$$;

-- Fonction helper pour récupérer les options d'un module
CREATE OR REPLACE FUNCTION public.get_module_options_v2(_user_id uuid, _module_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(options, '{}'::jsonb)
  FROM public.user_modules
  WHERE user_id = _user_id AND module_key = _module_key
$$;