
-- =====================================================
-- MIGRATION DES DOCUMENTS ET TRIGGERS DE SYNCHRONISATION
-- =====================================================

-- 1. Migrer les documents collaborateurs existants vers media_assets
INSERT INTO media_assets (agency_id, storage_bucket, storage_path, file_name, file_size, mime_type, created_by)
SELECT DISTINCT 
  cd.agency_id,
  'rh-documents',
  cd.file_path,
  COALESCE(cd.file_name, split_part(cd.file_path, '/', -1)),
  cd.file_size,
  cd.file_type,
  cd.uploaded_by
FROM collaborator_documents cd
WHERE cd.file_path IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM media_assets ma 
  WHERE ma.storage_path = cd.file_path AND ma.agency_id = cd.agency_id
);

-- 2. Créer les liens pour les documents collaborateurs existants
INSERT INTO media_links (agency_id, folder_id, asset_id, label, source_module, source_table, source_id, created_by)
SELECT 
  cd.agency_id,
  ensure_collaborator_folder(cd.collaborator_id, cd.agency_id),
  ma.id,
  COALESCE(cd.title, cd.file_name),
  'rh',
  'collaborator_documents',
  cd.id,
  cd.uploaded_by
FROM collaborator_documents cd
JOIN media_assets ma ON ma.storage_path = cd.file_path AND ma.agency_id = cd.agency_id
WHERE NOT EXISTS (
  SELECT 1 FROM media_links ml 
  WHERE ml.source_table = 'collaborator_documents' AND ml.source_id = cd.id
);

-- 3. Migrer les documents administratifs existants vers media_assets
INSERT INTO media_assets (agency_id, storage_bucket, storage_path, file_name, file_size, mime_type, created_by)
SELECT DISTINCT 
  aad.agency_id,
  'admin-documents',
  aad.file_path,
  COALESCE(aad.file_name, split_part(aad.file_path, '/', -1)),
  aad.file_size,
  aad.mime_type,
  aad.uploaded_by
FROM agency_admin_documents aad
WHERE aad.file_path IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM media_assets ma 
  WHERE ma.storage_path = aad.file_path AND ma.agency_id = aad.agency_id
);

-- 4. Créer les liens pour les documents administratifs existants
INSERT INTO media_links (agency_id, folder_id, asset_id, label, source_module, source_table, source_id, created_by)
SELECT 
  aad.agency_id,
  (SELECT id FROM media_folders mf 
   WHERE mf.agency_id = aad.agency_id 
   AND mf.slug = 'documents-administratifs' 
   AND mf.deleted_at IS NULL 
   LIMIT 1),
  ma.id,
  COALESCE(aad.label, aad.file_name),
  'admin',
  'agency_admin_documents',
  aad.id,
  aad.uploaded_by
FROM agency_admin_documents aad
JOIN media_assets ma ON ma.storage_path = aad.file_path AND ma.agency_id = aad.agency_id
WHERE aad.file_path IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM media_links ml 
  WHERE ml.source_table = 'agency_admin_documents' AND ml.source_id = aad.id
);

-- 5. Trigger de synchronisation pour documents collaborateurs
CREATE OR REPLACE FUNCTION sync_collaborator_doc_to_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_folder_id UUID;
  v_subfolder_id UUID;
  v_file_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE media_links 
    SET deleted_at = now()
    WHERE source_table = 'collaborator_documents' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  
  v_folder_id := ensure_collaborator_folder(NEW.collaborator_id, NEW.agency_id);
  IF v_folder_id IS NULL THEN RETURN NEW; END IF;
  
  IF NEW.subfolder IS NOT NULL AND NEW.subfolder != '' THEN
    SELECT id INTO v_subfolder_id
    FROM media_folders
    WHERE agency_id = NEW.agency_id
      AND parent_id = v_folder_id
      AND slug = LOWER(REGEXP_REPLACE(
        TRANSLATE(NEW.subfolder, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucaaaeeeeiioouuc'),
        '[^a-z0-9]+', '-', 'g'
      ))
      AND deleted_at IS NULL;
    
    IF v_subfolder_id IS NULL THEN
      INSERT INTO media_folders (
        agency_id, parent_id, name, slug, is_system, access_scope, icon
      ) VALUES (
        NEW.agency_id, v_folder_id, NEW.subfolder,
        LOWER(REGEXP_REPLACE(
          TRANSLATE(NEW.subfolder, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucaaaeeeeiioouuc'),
          '[^a-z0-9]+', '-', 'g'
        )),
        FALSE, 'rh_sensitive', 'folder'
      )
      RETURNING id INTO v_subfolder_id;
    END IF;
    v_folder_id := v_subfolder_id;
  END IF;
  
  v_file_name := COALESCE(NEW.file_name, split_part(NEW.file_path, '/', -1));
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO media_assets (
      agency_id, storage_bucket, storage_path, file_name, file_size, mime_type, created_by
    ) VALUES (
      NEW.agency_id, 'rh-documents', NEW.file_path, v_file_name, NEW.file_size, NEW.file_type, NEW.uploaded_by
    )
    RETURNING id INTO v_asset_id;
    
    INSERT INTO media_links (
      agency_id, folder_id, asset_id, label, source_module, source_table, source_id, created_by
    ) VALUES (
      NEW.agency_id, v_folder_id, v_asset_id, COALESCE(NEW.title, v_file_name),
      'rh', 'collaborator_documents', NEW.id, NEW.uploaded_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE media_links
    SET folder_id = v_folder_id, label = COALESCE(NEW.title, label)
    WHERE source_table = 'collaborator_documents' AND source_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collaborator_doc_to_media ON collaborator_documents;
CREATE TRIGGER trg_sync_collaborator_doc_to_media
AFTER INSERT OR UPDATE OR DELETE ON collaborator_documents
FOR EACH ROW EXECUTE FUNCTION sync_collaborator_doc_to_media();

-- 6. Trigger de synchronisation pour documents administratifs
CREATE OR REPLACE FUNCTION sync_admin_doc_to_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_folder_id UUID;
  v_file_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE media_links 
    SET deleted_at = now()
    WHERE source_table = 'agency_admin_documents' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  
  SELECT id INTO v_folder_id
  FROM media_folders
  WHERE agency_id = NEW.agency_id
    AND slug = 'documents-administratifs'
    AND parent_id IS NULL
    AND deleted_at IS NULL;
  
  IF v_folder_id IS NULL THEN RETURN NEW; END IF;
  
  v_file_name := COALESCE(NEW.file_name, split_part(NEW.file_path, '/', -1));
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO media_assets (
      agency_id, storage_bucket, storage_path, file_name, file_size, mime_type, created_by
    ) VALUES (
      NEW.agency_id, 'admin-documents', NEW.file_path, v_file_name, NEW.file_size, NEW.mime_type, NEW.uploaded_by
    )
    RETURNING id INTO v_asset_id;
    
    INSERT INTO media_links (
      agency_id, folder_id, asset_id, label, source_module, source_table, source_id, created_by
    ) VALUES (
      NEW.agency_id, v_folder_id, v_asset_id, COALESCE(NEW.label, v_file_name),
      'admin', 'agency_admin_documents', NEW.id, NEW.uploaded_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE media_links
    SET label = COALESCE(NEW.label, label)
    WHERE source_table = 'agency_admin_documents' AND source_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_doc_to_media ON agency_admin_documents;
CREATE TRIGGER trg_sync_admin_doc_to_media
AFTER INSERT OR UPDATE OR DELETE ON agency_admin_documents
FOR EACH ROW EXECUTE FUNCTION sync_admin_doc_to_media();
