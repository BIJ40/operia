-- Créer les dossiers système de base pour CHAQUE agence active
-- Les dossiers sont créés avec is_system = true pour empêcher leur suppression

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Salariés' as name,
  'salaries' as slug,
  true as is_system,
  'rh_sensitive' as access_scope,
  'users' as icon,
  'blue' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Fournisseurs' as name,
  'fournisseurs' as slug,
  true as is_system,
  'general' as access_scope,
  'truck' as icon,
  'orange' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Documents administratifs' as name,
  'documents-administratifs' as slug,
  true as is_system,
  'admin' as access_scope,
  'file-text' as icon,
  'green' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Réunions' as name,
  'reunions' as slug,
  true as is_system,
  'general' as access_scope,
  'calendar' as icon,
  'purple' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Modèles et templates' as name,
  'modeles-templates' as slug,
  true as is_system,
  'general' as access_scope,
  'layout-template' as icon,
  'yellow' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO media_folders (agency_id, parent_id, name, slug, is_system, access_scope, icon, color)
SELECT 
  a.id as agency_id,
  NULL as parent_id,
  'Autres documents' as name,
  'autres-documents' as slug,
  true as is_system,
  'general' as access_scope,
  'folder' as icon,
  'default' as color
FROM apogee_agencies a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

-- Créer aussi un trigger pour créer automatiquement ces dossiers pour les nouvelles agences
CREATE OR REPLACE FUNCTION create_default_media_folders_for_agency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Salariés
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Salariés', 'salaries', true, 'rh_sensitive', 'users', 'blue');
  
  -- Fournisseurs
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Fournisseurs', 'fournisseurs', true, 'general', 'truck', 'orange');
  
  -- Documents administratifs
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Documents administratifs', 'documents-administratifs', true, 'admin', 'file-text', 'green');
  
  -- Réunions
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Réunions', 'reunions', true, 'general', 'calendar', 'purple');
  
  -- Modèles
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Modèles et templates', 'modeles-templates', true, 'general', 'layout-template', 'yellow');
  
  -- Autres
  INSERT INTO media_folders (agency_id, name, slug, is_system, access_scope, icon, color)
  VALUES (NEW.id, 'Autres documents', 'autres-documents', true, 'general', 'folder', 'default');
  
  RETURN NEW;
END;
$$;

-- Trigger pour nouvelles agences
DROP TRIGGER IF EXISTS trg_create_default_media_folders ON apogee_agencies;
CREATE TRIGGER trg_create_default_media_folders
AFTER INSERT ON apogee_agencies
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION create_default_media_folders_for_agency();