-- ============================================================================
-- MAINTENANCE MODE SYSTEM
-- Table pour gérer le mode maintenance avec whitelist par user_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id text PRIMARY KEY DEFAULT 'default',
  is_enabled boolean NOT NULL DEFAULT false,
  message text NOT NULL DEFAULT 'La plateforme est en cours d''amélioration et n''est donc plus disponible actuellement.',
  whitelisted_user_ids uuid[] NOT NULL DEFAULT '{}',
  enabled_at timestamp with time zone,
  enabled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: Lecture pour tous les authentifiés (pour check au login)
-- Modification uniquement par superadmin (N6)
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read maintenance settings"
ON public.maintenance_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only superadmin can manage maintenance"
ON public.maintenance_settings FOR ALL
USING (has_min_global_role(auth.uid(), 6))
WITH CHECK (has_min_global_role(auth.uid(), 6));

-- Fonction helper pour vérifier si un utilisateur peut se connecter
CREATE OR REPLACE FUNCTION public.can_user_login(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Mode maintenance désactivé = tout le monde peut se connecter
      WHEN NOT COALESCE((SELECT is_enabled FROM maintenance_settings WHERE id = 'default'), false) THEN true
      -- Mode maintenance activé = seuls les whitelisted peuvent se connecter
      ELSE p_user_id = ANY(COALESCE((SELECT whitelisted_user_ids FROM maintenance_settings WHERE id = 'default'), '{}'))
    END
$$;

-- Insert default row
INSERT INTO public.maintenance_settings (id, is_enabled, message, whitelisted_user_ids)
VALUES ('default', false, 'La plateforme est en cours d''amélioration et n''est donc plus disponible actuellement.', '{}')
ON CONFLICT (id) DO NOTHING;

-- Trigger pour updated_at
CREATE TRIGGER update_maintenance_settings_updated_at
BEFORE UPDATE ON public.maintenance_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();