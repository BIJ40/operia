-- =====================================================
-- SYNC BIDIRECTIONNELLE DOSSIERS ↔ MÉDIATHÈQUE
-- =====================================================

-- 1. SYNC: collaborator_document_folders → media_folders
-- Quand un dossier est créé dans les documents collaborateur,
-- le créer aussi dans la médiathèque sous /rh/salaries/{collaborator_id}/

CREATE OR REPLACE FUNCTION sync_collaborator_folder_to_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_collab_name text;
  v_rh_folder_id uuid;
  v_salaries_folder_id uuid;
  v_collab_folder_id uuid;
  v_parent_media_folder_id uuid;
BEGIN
  -- Get collaborator's agency and name
  SELECT c.agency_id, COALESCE(c.first_name || ' ' || c.last_name, 'Collaborateur')
  INTO v_agency_id, v_collab_name
  FROM collaborators c
  WHERE c.id = NEW.collaborator_id;

  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get or create RH folder
  SELECT id INTO v_rh_folder_id
  FROM media_folders
  WHERE agency_id = v_agency_id
    AND slug = 'rh'
    AND parent_id IS NULL
    AND deleted_at IS NULL;

  IF v_rh_folder_id IS NULL THEN
    RETURN NEW; -- No RH folder, skip
  END IF;

  -- Get or create "Salariés" folder under RH
  SELECT id INTO v_salaries_folder_id
  FROM media_folders
  WHERE agency_id = v_agency_id
    AND slug = 'salaries'
    AND parent_id = v_rh_folder_id
    AND deleted_at IS NULL;

  IF v_salaries_folder_id IS NULL THEN
    INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope)
    VALUES (v_agency_id, v_rh_folder_id, 'Salariés', 'salaries', true, 'rh')
    RETURNING id INTO v_salaries_folder_id;
  END IF;

  -- Get or create collaborator's folder
  SELECT id INTO v_collab_folder_id
  FROM media_folders
  WHERE agency_id = v_agency_id
    AND slug = NEW.collaborator_id::text
    AND parent_id = v_salaries_folder_id
    AND deleted_at IS NULL;

  IF v_collab_folder_id IS NULL THEN
    INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope)
    VALUES (v_agency_id, v_salaries_folder_id, v_collab_name, NEW.collaborator_id::text, true, 'rh')
    RETURNING id INTO v_collab_folder_id;
  END IF;

  -- Determine parent in media: if NEW has parent_folder_id, find corresponding media folder
  IF NEW.parent_folder_id IS NOT NULL THEN
    -- Find the parent collaborator folder's corresponding media folder
    SELECT mf.id INTO v_parent_media_folder_id
    FROM collaborator_document_folders cdf
    JOIN media_folders mf ON mf.slug = cdf.name 
      AND mf.agency_id = v_agency_id
      AND mf.parent_id IS NOT NULL
    WHERE cdf.id = NEW.parent_folder_id;
    
    -- If not found, use collaborator folder as parent
    IF v_parent_media_folder_id IS NULL THEN
      v_parent_media_folder_id := v_collab_folder_id;
    END IF;
  ELSE
    v_parent_media_folder_id := v_collab_folder_id;
  END IF;

  -- Create the folder in media_folders if not exists
  IF NOT EXISTS (
    SELECT 1 FROM media_folders
    WHERE agency_id = v_agency_id
      AND name = NEW.name
      AND parent_id = v_parent_media_folder_id
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO media_folders (
      agency_id,
      parent_id,
      name,
      slug,
      is_system,
      access_scope,
      metadata
    ) VALUES (
      v_agency_id,
      v_parent_media_folder_id,
      NEW.name,
      lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')),
      false,
      'rh',
      jsonb_build_object(
        'source', 'collaborator_document_folders',
        'source_folder_id', NEW.id,
        'collaborator_id', NEW.collaborator_id,
        'doc_type', NEW.doc_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collab_folder_to_media ON collaborator_document_folders;
CREATE TRIGGER trg_sync_collab_folder_to_media
  AFTER INSERT ON collaborator_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION sync_collaborator_folder_to_media();

-- 2. SYNC: Suppression dossier collaborateur → soft delete media folder
CREATE OR REPLACE FUNCTION unsync_collaborator_folder_from_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft delete the corresponding media folder
  UPDATE media_folders
  SET deleted_at = now()
  WHERE metadata->>'source_folder_id' = OLD.id::text
    AND deleted_at IS NULL;
    
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_unsync_collab_folder_from_media ON collaborator_document_folders;
CREATE TRIGGER trg_unsync_collab_folder_from_media
  BEFORE DELETE ON collaborator_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION unsync_collaborator_folder_from_media();