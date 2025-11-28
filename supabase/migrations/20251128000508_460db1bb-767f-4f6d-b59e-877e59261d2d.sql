-- ===========================================
-- SYSTÈME DE PERMISSIONS COMPLET
-- ===========================================

-- 1. Créer l'enum pour les rôles système (plafonds)
DO $$ BEGIN
  CREATE TYPE public.system_role AS ENUM ('visiteur', 'utilisateur', 'support', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Table des groupes (fonctions/métiers)
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'franchise' CHECK (type IN ('franchise', 'franchiseur')),
  system_role_limit system_role NOT NULL DEFAULT 'utilisateur',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Table des permissions par groupe
CREATE TABLE IF NOT EXISTS public.group_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  scope_id uuid NOT NULL REFERENCES public.scopes(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 4),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, scope_id)
);

-- 4. Mise à jour de la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS system_role system_role DEFAULT 'utilisateur';

-- 5. Mise à jour de user_permissions (ajouter deny, scope_id si manquant)
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS deny boolean DEFAULT false;

-- 6. Enable RLS sur les nouvelles tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

-- 7. Policies pour groups
CREATE POLICY "Everyone can view groups" ON public.groups
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage groups" ON public.groups
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. Policies pour group_permissions
CREATE POLICY "Everyone can view group_permissions" ON public.group_permissions
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage group_permissions" ON public.group_permissions
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. Trigger pour updated_at sur groups
CREATE OR REPLACE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Trigger pour updated_at sur group_permissions  
CREATE OR REPLACE TRIGGER update_group_permissions_updated_at
  BEFORE UPDATE ON public.group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Insérer les groupes par défaut
INSERT INTO public.groups (label, description, type, system_role_limit, display_order) VALUES
  ('Dirigeant', 'Dirigeant d''agence franchise', 'franchise', 'admin', 1),
  ('Assistante', 'Assistante administrative', 'franchise', 'utilisateur', 2),
  ('Commercial', 'Commercial terrain', 'franchise', 'utilisateur', 3),
  ('Externe', 'Utilisateur externe', 'franchise', 'visiteur', 4),
  ('Animateur réseau', 'Animateur du réseau franchiseur', 'franchiseur', 'support', 5),
  ('Directeur réseau', 'Directeur du réseau', 'franchiseur', 'admin', 6),
  ('DG', 'Direction générale', 'franchiseur', 'admin', 7)
ON CONFLICT DO NOTHING;

-- 12. Fonction pour calculer le niveau effectif de permission
CREATE OR REPLACE FUNCTION public.get_effective_permission_level(
  _user_id uuid,
  _scope_slug text
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope_id uuid;
  _scope_default integer;
  _user_system_role system_role;
  _user_group_id uuid;
  _group_system_role_limit system_role;
  _group_level integer;
  _override_level integer;
  _override_deny boolean;
  _system_role_ceiling integer;
  _final_level integer;
BEGIN
  -- 1. Récupérer le scope
  SELECT id, default_level INTO _scope_id, _scope_default
  FROM public.scopes WHERE slug = _scope_slug;
  
  IF _scope_id IS NULL THEN
    RETURN 0; -- Scope inexistant
  END IF;
  
  -- 2. Récupérer les infos utilisateur
  SELECT system_role, group_id INTO _user_system_role, _user_group_id
  FROM public.profiles WHERE id = _user_id;
  
  -- 3. Calculer le plafond du rôle système
  _system_role_ceiling := CASE _user_system_role
    WHEN 'admin' THEN 4
    WHEN 'support' THEN 3
    WHEN 'utilisateur' THEN 2
    WHEN 'visiteur' THEN 1
    ELSE 0
  END;
  
  -- 4. Vérifier override individuel (priorité maximale)
  SELECT level, deny INTO _override_level, _override_deny
  FROM public.user_permissions 
  WHERE user_id = _user_id AND scope_id = _scope_id;
  
  -- Si DENY explicite, retourner 0
  IF _override_deny = true THEN
    RETURN 0;
  END IF;
  
  -- Si override explicite, appliquer avec plafond
  IF _override_level IS NOT NULL THEN
    RETURN LEAST(_override_level, _system_role_ceiling);
  END IF;
  
  -- 5. Vérifier permissions du groupe
  IF _user_group_id IS NOT NULL THEN
    -- Récupérer le plafond du groupe
    SELECT system_role_limit INTO _group_system_role_limit
    FROM public.groups WHERE id = _user_group_id;
    
    -- Récupérer le niveau du groupe pour ce scope
    SELECT level INTO _group_level
    FROM public.group_permissions 
    WHERE group_id = _user_group_id AND scope_id = _scope_id;
    
    IF _group_level IS NOT NULL THEN
      -- Appliquer avec double plafond (groupe et rôle système)
      _final_level := _group_level;
      
      -- Plafond du groupe
      _final_level := LEAST(_final_level, CASE _group_system_role_limit
        WHEN 'admin' THEN 4
        WHEN 'support' THEN 3
        WHEN 'utilisateur' THEN 2
        WHEN 'visiteur' THEN 1
        ELSE 0
      END);
      
      -- Plafond du rôle système utilisateur
      RETURN LEAST(_final_level, _system_role_ceiling);
    END IF;
  END IF;
  
  -- 6. Retourner le défaut du scope avec plafond
  RETURN LEAST(COALESCE(_scope_default, 0), _system_role_ceiling);
END;
$$;