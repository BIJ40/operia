-- Mettre à jour la fonction get_effective_permission_level
-- pour que les overrides utilisateur NE SOIENT PAS plafonnés par system_role

CREATE OR REPLACE FUNCTION public.get_effective_permission_level(_scope_slug text, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope_id uuid;
  _system_role text;
  _system_role_ceiling integer;
  _override_level integer;
  _override_deny boolean;
  _group_id uuid;
  _group_level integer;
  _group_ceiling integer;
  _default_level integer;
BEGIN
  -- 1. Récupérer le scope_id
  SELECT id, COALESCE(default_level, 0) INTO _scope_id, _default_level
  FROM scopes
  WHERE slug = _scope_slug AND is_active = true;
  
  IF _scope_id IS NULL THEN
    RETURN 0;
  END IF;

  -- 2. Récupérer le system_role de l'utilisateur et calculer le plafond
  SELECT COALESCE(system_role, 'utilisateur'), group_id INTO _system_role, _group_id
  FROM profiles
  WHERE id = _user_id;
  
  _system_role_ceiling := CASE _system_role
    WHEN 'admin' THEN 4
    WHEN 'support' THEN 3
    WHEN 'utilisateur' THEN 2
    WHEN 'visiteur' THEN 1
    ELSE 2
  END;

  -- 3. PRIORITÉ 1: Vérifier les overrides utilisateur (SANS plafond system_role)
  SELECT level, COALESCE(deny, false) INTO _override_level, _override_deny
  FROM user_permissions
  WHERE user_id = _user_id AND scope_id = _scope_id;
  
  IF FOUND THEN
    -- DENY bloque totalement
    IF _override_deny THEN
      RETURN 0;
    END IF;
    
    -- Override SANS plafond - l'admin peut donner le niveau qu'il veut (borné 0-4 uniquement)
    IF _override_level IS NOT NULL THEN
      RETURN GREATEST(0, LEAST(4, _override_level));
    END IF;
  END IF;

  -- 4. PRIORITÉ 2: Vérifier les permissions du groupe (AVEC plafonds)
  IF _group_id IS NOT NULL THEN
    -- Récupérer le plafond du groupe
    SELECT 
      gp.level,
      CASE g.system_role_limit
        WHEN 'admin' THEN 4
        WHEN 'support' THEN 3
        WHEN 'utilisateur' THEN 2
        WHEN 'visiteur' THEN 1
        ELSE 2
      END
    INTO _group_level, _group_ceiling
    FROM group_permissions gp
    JOIN groups g ON g.id = gp.group_id
    WHERE gp.group_id = _group_id AND gp.scope_id = _scope_id;
    
    IF FOUND AND _group_level IS NOT NULL THEN
      -- Appliquer les deux plafonds: groupe ET system_role utilisateur
      RETURN LEAST(_group_level, _group_ceiling, _system_role_ceiling);
    END IF;
  END IF;

  -- 5. PRIORITÉ 3: Retourner le niveau par défaut du scope (avec plafond system_role)
  RETURN LEAST(_default_level, _system_role_ceiling);
END;
$$;