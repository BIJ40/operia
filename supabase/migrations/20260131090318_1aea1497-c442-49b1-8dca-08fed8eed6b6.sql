-- =====================================================
-- TRIGGER: Sync collaborator_documents → media library
-- Phase 1C - Complete
-- =====================================================

-- Helper function to get collaborator folder path
CREATE OR REPLACE FUNCTION public.get_collaborator_media_path(
  p_collaborator_id uuid,
  p_subfolder text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collab RECORD;
  v_base_path text;
  v_full_path text;
BEGIN
  SELECT id, first_name, last_name
  INTO v_collab
  FROM collaborators
  WHERE id = p_collaborator_id;
  
  IF v_collab IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_base_path := 'rh/salaries/' || 
    v_collab.id::text || '-' || 
    sanitize_path_segment(COALESCE(v_collab.first_name, '') || '-' || COALESCE(v_collab.last_name, 'inconnu'));
  
  IF p_subfolder IS NOT NULL AND p_subfolder != '' THEN
    v_full_path := v_base_path || '/' || sanitize_path_segment(p_subfolder);
  ELSE
    v_full_path := v_base_path;
  END IF;
  
  RETURN v_full_path;
END;
$$;

-- Main sync trigger function
CREATE OR REPLACE FUNCTION public.sync_collaborator_document_to_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_path text;
  v_folder_id uuid;
  v_asset_id uuid;
  v_collab_folder_id uuid;
  v_collab_name text;
BEGIN
  -- ========== DELETE ==========
  IF TG_OP = 'DELETE' THEN
    UPDATE media_links
    SET deleted_at = now()
    WHERE source_type = 'collaborator_document'
      AND source_id = OLD.id
      AND deleted_at IS NULL;
    
    RETURN OLD;
  END IF;
  
  -- Get collaborator name for folder
  SELECT sanitize_path_segment(COALESCE(first_name, '') || '-' || COALESCE(last_name, 'inconnu'))
  INTO v_collab_name
  FROM collaborators WHERE id = NEW.collaborator_id;
  
  IF v_collab_name IS NULL THEN
    RAISE WARNING 'Collaborator % not found', NEW.collaborator_id;
    RETURN NEW;
  END IF;
  
  -- ========== INSERT ==========
  IF TG_OP = 'INSERT' THEN
    -- 1. Find or create collaborator base folder under /rh/salaries
    SELECT id INTO v_collab_folder_id
    FROM media_folders
    WHERE agency_id = NEW.agency_id
      AND path = 'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name
      AND deleted_at IS NULL;
    
    IF v_collab_folder_id IS NULL THEN
      -- Find rh/salaries parent folder
      SELECT id INTO v_folder_id
      FROM media_folders
      WHERE agency_id = NEW.agency_id
        AND path = 'rh/salaries'
        AND deleted_at IS NULL;
      
      -- Create collaborator folder
      INSERT INTO media_folders (agency_id, name, path, parent_id, access_scope)
      VALUES (
        NEW.agency_id,
        NEW.collaborator_id::text || '-' || v_collab_name,
        'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name,
        v_folder_id,
        'rh'
      )
      RETURNING id INTO v_collab_folder_id;
    END IF;
    
    -- 2. Handle subfolder if present
    IF NEW.subfolder IS NOT NULL AND NEW.subfolder != '' THEN
      SELECT id INTO v_folder_id
      FROM media_folders
      WHERE agency_id = NEW.agency_id
        AND path = 'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name || '/' || sanitize_path_segment(NEW.subfolder)
        AND deleted_at IS NULL;
      
      IF v_folder_id IS NULL THEN
        INSERT INTO media_folders (agency_id, name, path, parent_id, access_scope)
        VALUES (
          NEW.agency_id,
          sanitize_path_segment(NEW.subfolder),
          'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name || '/' || sanitize_path_segment(NEW.subfolder),
          v_collab_folder_id,
          'rh'
        )
        RETURNING id INTO v_folder_id;
      END IF;
    ELSE
      v_folder_id := v_collab_folder_id;
    END IF;
    
    -- 3. Create media_asset
    INSERT INTO media_assets (agency_id, bucket, storage_path, file_name, mime_type, size_bytes, uploaded_by)
    VALUES (NEW.agency_id, 'rh-documents', NEW.file_path, NEW.file_name, NEW.file_type, NEW.file_size, NEW.uploaded_by)
    RETURNING id INTO v_asset_id;
    
    -- 4. Create media_link
    INSERT INTO media_links (folder_id, asset_id, display_name, source_type, source_id)
    VALUES (v_folder_id, v_asset_id, NEW.title, 'collaborator_document', NEW.id);
    
    RETURN NEW;
  END IF;
  
  -- ========== UPDATE ==========
  IF TG_OP = 'UPDATE' THEN
    -- Subfolder changed: soft-delete old link, create new
    IF OLD.subfolder IS DISTINCT FROM NEW.subfolder THEN
      -- Soft-delete old
      UPDATE media_links SET deleted_at = now()
      WHERE source_type = 'collaborator_document' AND source_id = NEW.id AND deleted_at IS NULL;
      
      -- Find existing asset
      SELECT asset_id INTO v_asset_id
      FROM media_links WHERE source_type = 'collaborator_document' AND source_id = NEW.id
      ORDER BY created_at DESC LIMIT 1;
      
      -- Find/create new folder
      SELECT id INTO v_collab_folder_id
      FROM media_folders
      WHERE agency_id = NEW.agency_id
        AND path = 'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name
        AND deleted_at IS NULL;
      
      IF NEW.subfolder IS NOT NULL AND NEW.subfolder != '' THEN
        SELECT id INTO v_folder_id
        FROM media_folders
        WHERE agency_id = NEW.agency_id
          AND path = 'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name || '/' || sanitize_path_segment(NEW.subfolder)
          AND deleted_at IS NULL;
        
        IF v_folder_id IS NULL THEN
          INSERT INTO media_folders (agency_id, name, path, parent_id, access_scope)
          VALUES (
            NEW.agency_id,
            sanitize_path_segment(NEW.subfolder),
            'rh/salaries/' || NEW.collaborator_id::text || '-' || v_collab_name || '/' || sanitize_path_segment(NEW.subfolder),
            v_collab_folder_id,
            'rh'
          )
          RETURNING id INTO v_folder_id;
        END IF;
      ELSE
        v_folder_id := v_collab_folder_id;
      END IF;
      
      -- Create new link
      IF v_asset_id IS NOT NULL AND v_folder_id IS NOT NULL THEN
        INSERT INTO media_links (folder_id, asset_id, display_name, source_type, source_id)
        VALUES (v_folder_id, v_asset_id, NEW.title, 'collaborator_document', NEW.id);
      END IF;
    
    -- Just title changed
    ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
      UPDATE media_links SET display_name = NEW.title
      WHERE source_type = 'collaborator_document' AND source_id = NEW.id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_collaborator_document_to_media ON collaborator_documents;

CREATE TRIGGER trg_sync_collaborator_document_to_media
AFTER INSERT OR UPDATE OR DELETE ON collaborator_documents
FOR EACH ROW
EXECUTE FUNCTION sync_collaborator_document_to_media();

-- Comment
COMMENT ON FUNCTION sync_collaborator_document_to_media() IS 
'Synchronizes collaborator_documents to media library. Creates assets/links on INSERT, moves on subfolder change, soft-deletes on DELETE.';