-- BLOC 2: user_access
CREATE TABLE user_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_key   TEXT NOT NULL REFERENCES module_catalog(key) ON DELETE CASCADE,
  granted      BOOLEAN NOT NULL DEFAULT true,
  access_level TEXT NOT NULL DEFAULT 'full'
    CHECK (access_level IN ('none', 'read', 'full')),
  options      JSONB,
  source       TEXT NOT NULL
    CHECK (source IN (
      'platform_assignment',
      'agency_delegation',
      'pack_grant',
      'job_preset',
      'manual_exception'
    )),
  delegated_by UUID REFERENCES profiles(id),
  granted_by   UUID REFERENCES profiles(id),
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY ua_self ON user_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY ua_agency_read ON user_access
  FOR SELECT TO authenticated
  USING (
    has_min_global_role(auth.uid(), 2)
    AND get_user_agency_id(auth.uid()) = get_user_agency_id(user_id)
  );

CREATE POLICY ua_n5 ON user_access
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY ua_delegate ON user_access
  FOR ALL TO authenticated
  USING (
    has_min_global_role(auth.uid(), 2)
    AND NOT has_min_global_role(auth.uid(), 5)
    AND get_user_agency_id(auth.uid()) = get_user_agency_id(user_id)
  );

-- BLOC 3: Migrer user_modules → user_access
INSERT INTO user_access (user_id, module_key, granted, options, source, granted_by, granted_at)
SELECT
  um.user_id,
  CASE um.module_key
    WHEN 'agence'  THEN 'pilotage.statistiques'
    WHEN 'aide'    THEN 'support.aide_en_ligne'
    WHEN 'guides'  THEN 'support.guides'
    WHEN 'parc'    THEN 'pilotage.parc'
    WHEN 'rh'      THEN 'organisation.salaries'
    ELSE um.module_key
  END,
  true,
  um.options,
  CASE um.module_key
    WHEN 'ticketing' THEN 'platform_assignment'
    ELSE 'agency_delegation'
  END,
  um.enabled_by,
  um.enabled_at
FROM user_modules um
WHERE COALESCE(
  CASE um.module_key
    WHEN 'agence'  THEN 'pilotage.statistiques'
    WHEN 'aide'    THEN 'support.aide_en_ligne'
    WHEN 'guides'  THEN 'support.guides'
    WHEN 'parc'    THEN 'pilotage.parc'
    WHEN 'rh'      THEN 'organisation.salaries'
    ELSE um.module_key
  END,
  um.module_key
) IN (SELECT key FROM module_catalog)
ON CONFLICT (user_id, module_key) DO NOTHING;