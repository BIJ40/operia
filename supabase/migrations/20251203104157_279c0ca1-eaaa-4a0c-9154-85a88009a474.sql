-- =====================================================
-- FUSION TOTALE : Utilisateur ↔ Collaborateur
-- =====================================================

-- 0. Supprimer la contrainte role_check si elle existe
ALTER TABLE agency_collaborators DROP CONSTRAINT IF EXISTS agency_collaborators_role_check;

-- 1. Trigger : auto-créer collaborateur quand un utilisateur est créé avec agency_id
CREATE OR REPLACE FUNCTION public.auto_create_collaborator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer collaborateur seulement si l'utilisateur a une agence
  IF NEW.agency_id IS NOT NULL THEN
    INSERT INTO agency_collaborators (
      agency_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      is_registered_user,
      type,
      role,
      created_by
    )
    VALUES (
      NEW.agency_id,
      NEW.id,
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      NEW.phone,
      true,
      -- Déterminer le type depuis role_agence
      CASE 
        WHEN LOWER(NEW.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
        WHEN LOWER(NEW.role_agence) LIKE '%dirig%' OR LOWER(NEW.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
        ELSE 'AUTRE'
      END,
      COALESCE(NULLIF(NEW.role_agence, ''), 'autre'),
      NEW.id
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Créer le trigger sur profiles (AFTER INSERT)
DROP TRIGGER IF EXISTS trigger_auto_create_collaborator ON profiles;
CREATE TRIGGER trigger_auto_create_collaborator
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_collaborator();

-- 3. Trigger pour sync si l'utilisateur change d'agence ou de nom
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si agency_id change de NULL vers une valeur → créer collaborateur
  IF OLD.agency_id IS NULL AND NEW.agency_id IS NOT NULL THEN
    INSERT INTO agency_collaborators (
      agency_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      is_registered_user,
      type,
      role
    )
    VALUES (
      NEW.agency_id,
      NEW.id,
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      NEW.phone,
      true,
      CASE 
        WHEN LOWER(NEW.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
        WHEN LOWER(NEW.role_agence) LIKE '%dirig%' OR LOWER(NEW.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
        ELSE 'AUTRE'
      END,
      COALESCE(NULLIF(NEW.role_agence, ''), 'autre')
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      agency_id = EXCLUDED.agency_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = now();
  -- Si l'utilisateur a déjà une agence → sync les données
  ELSIF NEW.agency_id IS NOT NULL THEN
    UPDATE agency_collaborators
    SET 
      first_name = COALESCE(NEW.first_name, first_name),
      last_name = COALESCE(NEW.last_name, last_name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      role = COALESCE(NULLIF(NEW.role_agence, ''), role),
      type = CASE 
        WHEN LOWER(NEW.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
        WHEN LOWER(NEW.role_agence) LIKE '%dirig%' OR LOWER(NEW.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
        ELSE type
      END,
      updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_collaborator_on_profile_update ON profiles;
CREATE TRIGGER trigger_sync_collaborator_on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.agency_id IS DISTINCT FROM NEW.agency_id OR
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.role_agence IS DISTINCT FROM NEW.role_agence
  )
  EXECUTE FUNCTION sync_collaborator_on_profile_update();

-- 4. Index unique sur user_id pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborators_user_id_unique 
ON agency_collaborators(user_id) WHERE user_id IS NOT NULL;

-- 5. Migration initiale : créer les fiches collaborateur pour utilisateurs existants
INSERT INTO agency_collaborators (
  agency_id,
  user_id,
  first_name,
  last_name,
  email,
  phone,
  is_registered_user,
  type,
  role,
  created_by
)
SELECT 
  p.agency_id,
  p.id,
  COALESCE(p.first_name, ''),
  COALESCE(p.last_name, ''),
  p.email,
  p.phone,
  true,
  CASE 
    WHEN LOWER(p.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
    WHEN LOWER(p.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
    WHEN LOWER(p.role_agence) LIKE '%dirig%' OR LOWER(p.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
    WHEN LOWER(p.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
    ELSE 'AUTRE'
  END,
  COALESCE(NULLIF(p.role_agence, ''), 'autre'),
  p.id
FROM profiles p
WHERE p.agency_id IS NOT NULL
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM agency_collaborators c WHERE c.user_id = p.id
  );

-- 6. Commentaires
COMMENT ON FUNCTION auto_create_collaborator() IS 'Auto-crée une fiche collaborateur quand un utilisateur est créé avec agency_id';
COMMENT ON FUNCTION sync_collaborator_on_profile_update() IS 'Synchronise la fiche collaborateur quand le profil utilisateur est modifié';