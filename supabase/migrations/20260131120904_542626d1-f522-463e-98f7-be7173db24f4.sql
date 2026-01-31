
-- Désactiver temporairement le trigger de protection
ALTER TABLE media_folders DISABLE TRIGGER trg_protect_system_folders;

-- Corriger le dossier DUCOURNEAU J qui contient les docs ALADAME -> le renommer en ALADAME G
UPDATE media_folders 
SET name = 'ALADAME G', 
    slug = 'salarie-0fd7187d-a1a6-4467-9cff-b3625755db89'
WHERE id = '015bb45c-b6c6-48db-a043-7c8c230355cf';

-- Créer les dossiers pour chaque collaborateur actif s'ils n'existent pas
INSERT INTO media_folders (agency_id, name, slug, parent_id, is_system, access_scope)
SELECT DISTINCT
  c.agency_id,
  format_collaborator_folder_name(c.last_name, c.first_name),
  'salarie-' || c.id,
  '8c86f279-6e15-46df-83ae-7ca0317b4890'::uuid,
  true,
  'rh'::media_access_scope
FROM collaborators c
WHERE c.leaving_date IS NULL
AND NOT EXISTS (
  SELECT 1 FROM media_folders mf 
  WHERE mf.slug = 'salarie-' || c.id
);

-- Supprimer le dossier ALADAME non-système en doublon
DELETE FROM media_folders WHERE id = '15ce83ad-0e37-49b7-85a3-02a6ce72208a';

-- Nettoyer les dossiers Salariés dupliqués sans enfants ni liens
DELETE FROM media_folders 
WHERE slug = 'salaries' 
AND id != '8c86f279-6e15-46df-83ae-7ca0317b4890'
AND NOT EXISTS (SELECT 1 FROM media_folders child WHERE child.parent_id = media_folders.id)
AND NOT EXISTS (SELECT 1 FROM media_links ml WHERE ml.folder_id = media_folders.id);

-- Réactiver le trigger de protection
ALTER TABLE media_folders ENABLE TRIGGER trg_protect_system_folders;
