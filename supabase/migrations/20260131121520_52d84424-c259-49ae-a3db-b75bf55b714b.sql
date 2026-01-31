-- Fonction pour synchroniser un fichier de réunion vers la médiathèque
CREATE OR REPLACE FUNCTION sync_meeting_file_to_media_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reunions_folder_id uuid;
  v_asset_id uuid;
  v_file_name text;
  v_file_size bigint;
  v_mime_type text;
BEGIN
  -- Ne traiter que si on a un fichier
  IF NEW.presentation_file_path IS NULL OR NEW.presentation_file_path = '' THEN
    RETURN NEW;
  END IF;

  -- Récupérer le dossier Réunions pour cette agence
  SELECT id INTO v_reunions_folder_id
  FROM media_folders
  WHERE agency_id = NEW.agency_id
    AND slug = 'reunions'
    AND is_system = true
    AND deleted_at IS NULL;

  -- Si pas de dossier Réunions, ne rien faire
  IF v_reunions_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extraire le nom de fichier depuis le chemin
  v_file_name := COALESCE(
    regexp_replace(NEW.presentation_file_path, '^.*/([^/]+)$', '\1'),
    'presentation'
  );
  
  -- Deviner le mime type depuis l'extension
  v_mime_type := CASE 
    WHEN NEW.presentation_file_path ILIKE '%.pdf' THEN 'application/pdf'
    WHEN NEW.presentation_file_path ILIKE '%.ppt%' THEN 'application/vnd.ms-powerpoint'
    WHEN NEW.presentation_file_path ILIKE '%.doc%' THEN 'application/msword'
    WHEN NEW.presentation_file_path ILIKE '%.xls%' THEN 'application/vnd.ms-excel'
    WHEN NEW.presentation_file_path ILIKE '%.jpg' OR NEW.presentation_file_path ILIKE '%.jpeg' THEN 'image/jpeg'
    WHEN NEW.presentation_file_path ILIKE '%.png' THEN 'image/png'
    ELSE 'application/octet-stream'
  END;

  -- Vérifier si l'asset existe déjà (pour éviter les doublons)
  SELECT id INTO v_asset_id
  FROM media_assets
  WHERE agency_id = NEW.agency_id
    AND storage_path = NEW.presentation_file_path;

  IF v_asset_id IS NULL THEN
    -- Créer l'asset
    INSERT INTO media_assets (
      agency_id,
      storage_bucket,
      storage_path,
      file_name,
      file_size,
      mime_type,
      metadata
    ) VALUES (
      NEW.agency_id,
      'rh-meetings',
      NEW.presentation_file_path,
      v_file_name,
      0, -- On ne connaît pas la taille ici
      v_mime_type,
      jsonb_build_object(
        'source', 'rh_meetings',
        'meeting_id', NEW.id,
        'meeting_title', NEW.title,
        'meeting_date', NEW.meeting_date
      )
    )
    RETURNING id INTO v_asset_id;
  END IF;

  -- Vérifier si le lien existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM media_links
    WHERE asset_id = v_asset_id
      AND folder_id = v_reunions_folder_id
      AND deleted_at IS NULL
  ) THEN
    -- Créer le lien dans le dossier Réunions
    INSERT INTO media_links (
      agency_id,
      asset_id,
      folder_id,
      label
    ) VALUES (
      NEW.agency_id,
      v_asset_id,
      v_reunions_folder_id,
      COALESCE(NEW.title, 'Réunion') || ' - ' || to_char(NEW.meeting_date, 'DD/MM/YYYY')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour sync automatique lors de l'insert/update d'une réunion avec fichier
DROP TRIGGER IF EXISTS trigger_sync_meeting_to_media ON rh_meetings;
CREATE TRIGGER trigger_sync_meeting_to_media
  AFTER INSERT OR UPDATE OF presentation_file_path ON rh_meetings
  FOR EACH ROW
  EXECUTE FUNCTION sync_meeting_file_to_media_library();

-- Fonction pour supprimer le lien média quand la réunion est supprimée
CREATE OR REPLACE FUNCTION unsync_meeting_file_from_media_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id uuid;
BEGIN
  -- Trouver l'asset lié à ce fichier
  IF OLD.presentation_file_path IS NOT NULL THEN
    SELECT id INTO v_asset_id
    FROM media_assets
    WHERE agency_id = OLD.agency_id
      AND storage_path = OLD.presentation_file_path;

    IF v_asset_id IS NOT NULL THEN
      -- Soft delete les liens (pas l'asset car le fichier existe encore)
      UPDATE media_links
      SET deleted_at = now()
      WHERE asset_id = v_asset_id
        AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Trigger pour unsync lors de la suppression
DROP TRIGGER IF EXISTS trigger_unsync_meeting_from_media ON rh_meetings;
CREATE TRIGGER trigger_unsync_meeting_from_media
  BEFORE DELETE ON rh_meetings
  FOR EACH ROW
  EXECUTE FUNCTION unsync_meeting_file_from_media_library();