-- Phase 1.5: Fusion profil ↔ collaborateur

-- 1. Fonction pour récupérer le collaborator_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_current_collaborator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id 
  FROM collaborators c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Trigger pour créer automatiquement un collaborateur quand un profil avec agency_id est créé
CREATE OR REPLACE FUNCTION public.auto_create_collaborator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer collaborateur seulement si l'utilisateur a une agence
  IF NEW.agency_id IS NOT NULL THEN
    INSERT INTO collaborators (
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

-- 3. Trigger pour synchroniser les modifications du profil vers le collaborateur
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si agency_id change de NULL vers une valeur → créer collaborateur
  IF OLD.agency_id IS NULL AND NEW.agency_id IS NOT NULL THEN
    INSERT INTO collaborators (
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
    UPDATE collaborators
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

-- 4. Créer les triggers sur profiles
DROP TRIGGER IF EXISTS on_profile_created_create_collaborator ON profiles;
CREATE TRIGGER on_profile_created_create_collaborator
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_collaborator();

DROP TRIGGER IF EXISTS on_profile_updated_sync_collaborator ON profiles;
CREATE TRIGGER on_profile_updated_sync_collaborator
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_collaborator_on_profile_update();

-- 5. Migration des données existantes : créer les collaborateurs manquants pour les profils d'agence
INSERT INTO collaborators (
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
  COALESCE(NULLIF(p.role_agence, ''), 'autre')
FROM profiles p
WHERE p.agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM collaborators c WHERE c.user_id = p.id
  )
ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO NOTHING;