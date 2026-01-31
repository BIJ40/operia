-- Fix security warnings from linter

-- 1. Fix SECURITY DEFINER view - recreate as regular view with SECURITY INVOKER
DROP VIEW IF EXISTS public.media_orphan_assets;
CREATE VIEW public.media_orphan_assets 
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.agency_id,
  a.storage_bucket,
  a.storage_path,
  a.deleted_at
FROM media_assets a
WHERE a.deleted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_links l 
    WHERE l.asset_id = a.id 
      AND l.deleted_at IS NULL
  );

-- 2. Fix functions without search_path (protect_system_folders and update_media_updated_at)
CREATE OR REPLACE FUNCTION protect_system_folders()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete a system folder';
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.is_system = true THEN
    IF OLD.name IS DISTINCT FROM NEW.name 
       OR OLD.slug IS DISTINCT FROM NEW.slug 
       OR OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      RAISE EXCEPTION 'Cannot modify structure of a system folder';
    END IF;
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      RAISE EXCEPTION 'Cannot soft-delete a system folder';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;