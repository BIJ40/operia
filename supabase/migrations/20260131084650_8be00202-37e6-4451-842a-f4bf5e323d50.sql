-- =====================================================
-- MEDIA LIBRARY PHASE 1 - Schema + Functions + RLS
-- =====================================================

-- 1. ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE media_access_scope AS ENUM ('general', 'rh', 'rh_sensitive', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABLES
-- =====================================================

-- System folders (reference data)
CREATE TABLE IF NOT EXISTS public.media_system_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_slug TEXT UNIQUE NOT NULL,
  display_label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT 'default',
  description TEXT,
  access_scope media_access_scope NOT NULL DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System routes (templates per module)
CREATE TABLE IF NOT EXISTS public.media_system_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  route_template TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_key, route_template)
);

-- Physical assets (one per file)
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(agency_id, storage_bucket, storage_path)
);

-- Folder hierarchy
CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT 'default',
  is_system BOOLEAN DEFAULT false,
  access_scope media_access_scope NOT NULL DEFAULT 'general',
  entity_type TEXT,
  entity_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Unique index compatible all Postgres versions
CREATE UNIQUE INDEX IF NOT EXISTS media_folders_unique_parent_slug
ON media_folders (
  agency_id,
  COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
  slug
)
WHERE deleted_at IS NULL;

-- Links between assets and folders (N-N)
CREATE TABLE IF NOT EXISTS public.media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES media_folders(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  label TEXT,
  source_module TEXT,
  source_table TEXT,
  source_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(folder_id, asset_id)
);

-- 3. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_media_assets_agency ON media_assets(agency_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted ON media_assets(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_folders_agency ON media_folders(agency_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_entity ON media_folders(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_links_folder ON media_links(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_links_asset ON media_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_media_links_source ON media_links(source_module, source_id) WHERE source_id IS NOT NULL;

-- 4. HELPER FUNCTIONS
-- =====================================================

-- Sanitize path segment (accents, spaces → dashes)
CREATE OR REPLACE FUNCTION public.sanitize_path_segment(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := lower(
    regexp_replace(
      regexp_replace(
        translate(
          trim(COALESCE(p_input, '')),
          'àâäãåéèêëïîìíôöòóõùûüúçñœæÀÂÄÃÅÉÈÊËÏÎÌÍÔÖÒÓÕÙÛÜÚÇÑŒÆ''""«»''/\',
          'aaaaaeeeeiiiiooooouuuucnoaAAAAAEEEEIIIIOOOOOUUUUCNOA---------'
        ),
        '[^a-zA-Z0-9_-]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
  );
  
  IF v_result IS NULL OR v_result = '' THEN
    v_result := 'inconnu';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Check module option in user_modules table
CREATE OR REPLACE FUNCTION public.has_module_option_v2(
  p_user_id UUID,
  p_module_key TEXT,
  p_option_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_modules
    WHERE user_id = p_user_id
      AND module_key = p_module_key
      AND COALESCE((options->>p_option_key)::boolean, false) = true
  )
  OR has_min_global_role(p_user_id, 5)
$$;

-- Check access to folder scope
CREATE OR REPLACE FUNCTION public.can_access_folder_scope(p_user_id UUID, p_scope media_access_scope)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE p_scope
    WHEN 'general' THEN 
      has_min_global_role(p_user_id, 5) OR
      has_module_option_v2(p_user_id, 'divers_documents', 'consulter')
    WHEN 'rh' THEN 
      has_min_global_role(p_user_id, 5) OR
      has_module_option_v2(p_user_id, 'rh', 'rh_viewer') OR
      has_module_option_v2(p_user_id, 'rh', 'rh_admin')
    WHEN 'rh_sensitive' THEN 
      has_min_global_role(p_user_id, 4) OR
      has_module_option_v2(p_user_id, 'rh', 'rh_admin')
    WHEN 'admin' THEN 
      has_min_global_role(p_user_id, 4)
    ELSE false
  END;
$$;

-- Check permission to manage media
CREATE OR REPLACE FUNCTION public.can_manage_media(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    has_min_global_role(p_user_id, 5) OR
    has_module_option_v2(p_user_id, 'divers_documents', 'gerer');
$$;

-- Resolve route template with context
CREATE OR REPLACE FUNCTION public.resolve_route_template(
  p_template TEXT,
  p_context JSONB
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_result TEXT := p_template;
  v_key TEXT;
  v_value TEXT;
  v_sanitized TEXT;
BEGIN
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_context) LOOP
    v_sanitized := sanitize_path_segment(COALESCE(v_value, ''));
    IF v_sanitized = 'inconnu' AND (v_value IS NULL OR trim(v_value) = '') THEN
      v_result := regexp_replace(v_result, '/\{' || v_key || '\}', '', 'g');
    ELSE
      v_result := replace(v_result, '{' || v_key || '}', v_sanitized);
    END IF;
  END LOOP;
  
  v_result := regexp_replace(v_result, '/?\{[^}]+\}', '', 'g');
  v_result := regexp_replace(v_result, '/+', '/', 'g');
  v_result := regexp_replace(v_result, '/$', '', 'g');
  
  RETURN v_result;
END;
$$;

-- Ensure folder exists with scope inheritance
CREATE OR REPLACE FUNCTION public.ensure_media_folder(
  p_agency_id UUID,
  p_path TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_parts TEXT[];
  v_parent_id UUID := NULL;
  v_parent_scope media_access_scope := 'general';
  v_folder_id UUID;
  v_slug TEXT;
  v_name TEXT;
  v_current_path_slug TEXT := '';
  v_is_system BOOLEAN;
  v_system_info RECORD;
  v_access_scope media_access_scope;
BEGIN
  v_parts := string_to_array(trim(both '/' from p_path), '/');
  
  FOREACH v_name IN ARRAY v_parts LOOP
    v_slug := sanitize_path_segment(v_name);
    v_current_path_slug := v_current_path_slug || '/' || v_slug;
    
    SELECT * INTO v_system_info 
    FROM media_system_folders 
    WHERE path_slug = v_current_path_slug;
    
    v_is_system := v_system_info IS NOT NULL;
    
    IF v_system_info IS NOT NULL THEN
      v_access_scope := v_system_info.access_scope;
    ELSE
      IF v_parent_id IS NOT NULL THEN
        SELECT access_scope INTO v_access_scope
        FROM media_folders
        WHERE id = v_parent_id;
      END IF;
      v_access_scope := COALESCE(v_access_scope, v_parent_scope, 'general');
    END IF;
    
    SELECT id INTO v_folder_id
    FROM media_folders
    WHERE agency_id = p_agency_id
      AND parent_id IS NOT DISTINCT FROM v_parent_id
      AND slug = v_slug
      AND deleted_at IS NULL;
    
    IF v_folder_id IS NULL THEN
      INSERT INTO media_folders (
        agency_id, parent_id, name, slug,
        is_system, access_scope,
        icon, color,
        entity_type, entity_id
      ) VALUES (
        p_agency_id, v_parent_id, v_name, v_slug,
        v_is_system, v_access_scope,
        COALESCE(v_system_info.icon, 'folder'),
        COALESCE(v_system_info.color, 'default'),
        CASE WHEN v_name = v_parts[array_length(v_parts, 1)] THEN p_entity_type ELSE NULL END,
        CASE WHEN v_name = v_parts[array_length(v_parts, 1)] THEN p_entity_id ELSE NULL END
      )
      RETURNING id INTO v_folder_id;
    END IF;
    
    v_parent_id := v_folder_id;
    v_parent_scope := v_access_scope;
  END LOOP;
  
  RETURN v_folder_id;
END;
$$;

-- 5. TRIGGER: Protect system folders
-- =====================================================
CREATE OR REPLACE FUNCTION protect_system_folders()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_system_folders ON media_folders;
CREATE TRIGGER trg_protect_system_folders
BEFORE UPDATE OR DELETE ON media_folders
FOR EACH ROW EXECUTE FUNCTION protect_system_folders();

-- 6. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE media_system_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_system_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_links ENABLE ROW LEVEL SECURITY;

-- System folders: read-only for all authenticated
DROP POLICY IF EXISTS "system_folders_select" ON media_system_folders;
CREATE POLICY "system_folders_select" ON media_system_folders
FOR SELECT TO authenticated USING (true);

-- System routes: read-only for all authenticated
DROP POLICY IF EXISTS "system_routes_select" ON media_system_routes;
CREATE POLICY "system_routes_select" ON media_system_routes
FOR SELECT TO authenticated USING (true);

-- MEDIA_FOLDERS policies
DROP POLICY IF EXISTS "folders_select" ON media_folders;
CREATE POLICY "folders_select" ON media_folders
FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    has_min_global_role(auth.uid(), 5)
    OR (
      agency_id = get_user_agency_id(auth.uid())
      AND can_access_folder_scope(auth.uid(), access_scope)
    )
  )
);

DROP POLICY IF EXISTS "folders_insert" ON media_folders;
CREATE POLICY "folders_insert" ON media_folders
FOR INSERT TO authenticated WITH CHECK (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "folders_update" ON media_folders;
CREATE POLICY "folders_update" ON media_folders
FOR UPDATE TO authenticated USING (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
) WITH CHECK (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

-- MEDIA_LINKS policies
DROP POLICY IF EXISTS "links_select" ON media_links;
CREATE POLICY "links_select" ON media_links
FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    has_min_global_role(auth.uid(), 5)
    OR EXISTS (
      SELECT 1 FROM media_folders f 
      WHERE f.id = media_links.folder_id 
        AND f.deleted_at IS NULL
        AND f.agency_id = get_user_agency_id(auth.uid())
        AND can_access_folder_scope(auth.uid(), f.access_scope)
    )
  )
);

DROP POLICY IF EXISTS "links_insert" ON media_links;
CREATE POLICY "links_insert" ON media_links
FOR INSERT TO authenticated WITH CHECK (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "links_update" ON media_links;
CREATE POLICY "links_update" ON media_links
FOR UPDATE TO authenticated USING (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "links_delete" ON media_links;
CREATE POLICY "links_delete" ON media_links
FOR DELETE TO authenticated USING (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

-- MEDIA_ASSETS policies (fixed: use media_assets.id instead of ambiguous id)
DROP POLICY IF EXISTS "assets_select_via_link" ON media_assets;
CREATE POLICY "assets_select_via_link" ON media_assets
FOR SELECT TO authenticated USING (
  has_min_global_role(auth.uid(), 5)
  OR EXISTS (
    SELECT 1 FROM media_links l
    JOIN media_folders f ON f.id = l.folder_id
    WHERE l.asset_id = media_assets.id
      AND l.deleted_at IS NULL
      AND f.deleted_at IS NULL
      AND f.agency_id = get_user_agency_id(auth.uid())
      AND can_access_folder_scope(auth.uid(), f.access_scope)
  )
);

DROP POLICY IF EXISTS "assets_insert" ON media_assets;
CREATE POLICY "assets_insert" ON media_assets
FOR INSERT TO authenticated WITH CHECK (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "assets_update" ON media_assets;
CREATE POLICY "assets_update" ON media_assets
FOR UPDATE TO authenticated USING (
  can_manage_media(auth.uid()) AND
  agency_id = get_user_agency_id(auth.uid())
);

-- 7. SEED SYSTEM FOLDERS
-- =====================================================
INSERT INTO media_system_folders (path_slug, display_label, icon, color, access_scope, sort_order) VALUES
  ('/rh', 'RH', 'users', 'green', 'rh', 1),
  ('/rh/salaries', 'Salariés', 'user', 'green', 'rh', 2),
  ('/vehicules', 'Véhicules', 'car', 'blue', 'general', 3),
  ('/administratif', 'Administratif', 'building', 'orange', 'admin', 4),
  ('/gestion', 'Gestion', 'briefcase', 'purple', 'general', 5),
  ('/gestion/reunions', 'Réunions', 'calendar', 'purple', 'general', 6),
  ('/apporteurs', 'Apporteurs', 'handshake', 'teal', 'general', 7),
  ('/fournisseurs', 'Fournisseurs', 'truck', 'gray', 'general', 8)
ON CONFLICT (path_slug) DO NOTHING;

-- Seed system routes
INSERT INTO media_system_routes (module_key, route_template, priority) VALUES
  ('collaborator_documents', '/rh/salaries/{last_name}-{first_name}/{subfolder}', 10),
  ('agency_admin_documents', '/administratif/{document_type}', 10),
  ('rh_meetings', '/gestion/reunions/{year}/{month}', 10)
ON CONFLICT (module_key, route_template) DO NOTHING;

-- 8. ORPHAN ASSETS VIEW (for garbage collection)
-- =====================================================
DROP VIEW IF EXISTS public.media_orphan_assets;
CREATE VIEW public.media_orphan_assets AS
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

-- 9. UPDATE TIMESTAMPS TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW EXECUTE FUNCTION update_media_updated_at();

DROP TRIGGER IF EXISTS trg_media_folders_updated_at ON media_folders;
CREATE TRIGGER trg_media_folders_updated_at
BEFORE UPDATE ON media_folders
FOR EACH ROW EXECUTE FUNCTION update_media_updated_at();