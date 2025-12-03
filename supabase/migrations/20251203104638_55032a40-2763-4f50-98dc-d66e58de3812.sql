-- Renommer la table agency_collaborators en collaborators
ALTER TABLE agency_collaborators RENAME TO collaborators;

-- Renommer l'index unique
ALTER INDEX IF EXISTS idx_collaborators_user_id_unique RENAME TO idx_collaborators_user_id;

-- Mettre à jour les triggers pour référencer la nouvelle table
DROP TRIGGER IF EXISTS auto_create_collaborator_trigger ON profiles;
DROP TRIGGER IF EXISTS sync_collaborator_trigger ON profiles;

-- Le trigger auto_create_collaborator reste inchangé car il INSERT INTO agency_collaborators
-- mais la table a été renommée, donc le trigger fonctionne toujours
-- (le nom de table est résolu au runtime)

-- Mettre à jour les fonctions pour utiliser le nouveau nom de table
CREATE OR REPLACE FUNCTION public.auto_create_collaborator()
RETURNS TRIGGER
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

CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
RETURNS TRIGGER
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

-- Recréer les triggers
CREATE TRIGGER auto_create_collaborator_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_create_collaborator();

CREATE TRIGGER sync_collaborator_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_collaborator_on_profile_update();

-- Ajouter commentaire sur la table renommée
COMMENT ON TABLE collaborators IS 'Module RH & Parc - Fiches collaborateurs (fusion totale avec utilisateurs agence)';