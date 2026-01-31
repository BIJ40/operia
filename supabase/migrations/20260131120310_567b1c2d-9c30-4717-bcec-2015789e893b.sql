
-- =====================================================
-- SYNCHRONISATION MÉDIATHÈQUE - FONCTIONS ET DONNÉES
-- =====================================================

-- 1. Fonction utilitaire: créer le nom de dossier salarié (NOM Initiale)
CREATE OR REPLACE FUNCTION format_collaborator_folder_name(
  p_last_name TEXT,
  p_first_name TEXT
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN UPPER(COALESCE(p_last_name, 'INCONNU')) || ' ' || 
         UPPER(LEFT(COALESCE(p_first_name, 'X'), 1));
END;
$$;

-- 2. Fonction: Créer le dossier individuel d'un salarié sous /Salariés
CREATE OR REPLACE FUNCTION ensure_collaborator_folder(
  p_collaborator_id UUID,
  p_agency_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salaries_folder_id UUID;
  v_collaborator_folder_id UUID;
  v_folder_name TEXT;
  v_folder_slug TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  SELECT first_name, last_name INTO v_first_name, v_last_name
  FROM collaborators WHERE id = p_collaborator_id;
  
  v_folder_name := format_collaborator_folder_name(v_last_name, v_first_name);
  v_folder_slug := LOWER(REGEXP_REPLACE(
    TRANSLATE(v_folder_name, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucaaaeeeeiioouuc'),
    '[^a-z0-9]+', '-', 'g'
  ));
  
  SELECT id INTO v_salaries_folder_id
  FROM media_folders
  WHERE agency_id = p_agency_id
    AND slug = 'salaries'
    AND parent_id IS NULL
    AND deleted_at IS NULL;
  
  IF v_salaries_folder_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO v_collaborator_folder_id
  FROM media_folders
  WHERE agency_id = p_agency_id
    AND parent_id = v_salaries_folder_id
    AND slug = v_folder_slug
    AND deleted_at IS NULL;
  
  IF v_collaborator_folder_id IS NULL THEN
    INSERT INTO media_folders (
      agency_id, parent_id, name, slug, 
      is_system, access_scope, icon, color
    ) VALUES (
      p_agency_id, v_salaries_folder_id, v_folder_name, v_folder_slug,
      TRUE, 'rh_sensitive', 'user', 'default'
    )
    RETURNING id INTO v_collaborator_folder_id;
  END IF;
  
  RETURN v_collaborator_folder_id;
END;
$$;

-- 3. Créer les dossiers pour tous les collaborateurs existants
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id, agency_id 
    FROM collaborators 
    WHERE agency_id IS NOT NULL
  LOOP
    PERFORM ensure_collaborator_folder(rec.id, rec.agency_id);
  END LOOP;
END;
$$;

-- 4. Trigger: Créer automatiquement le dossier quand un collaborateur est créé
CREATE OR REPLACE FUNCTION trg_create_collaborator_folder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NOT NULL THEN
    PERFORM ensure_collaborator_folder(NEW.id, NEW.agency_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collaborator_folder_on_insert ON collaborators;
CREATE TRIGGER trg_collaborator_folder_on_insert
AFTER INSERT ON collaborators
FOR EACH ROW EXECUTE FUNCTION trg_create_collaborator_folder();
