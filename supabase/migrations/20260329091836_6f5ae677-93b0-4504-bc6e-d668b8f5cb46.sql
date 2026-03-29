-- BLOC 1: plan_catalog
CREATE TABLE plan_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plan_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY pc_select ON plan_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY pc_write ON plan_catalog
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (
    has_min_global_role(auth.uid(), 5)
    AND (NOT is_system OR has_min_global_role(auth.uid(), 6))
  );

-- BLOC 3: plan_module_grants
CREATE TABLE plan_module_grants (
  plan_id         UUID NOT NULL REFERENCES plan_catalog(id) ON DELETE CASCADE,
  module_key      TEXT NOT NULL REFERENCES module_catalog(key) ON DELETE CASCADE,
  access_level    TEXT NOT NULL DEFAULT 'full'
    CHECK (access_level IN ('none', 'read', 'full')),
  options_default JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (plan_id, module_key)
);

ALTER TABLE plan_module_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY pmg_select ON plan_module_grants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY pmg_write ON plan_module_grants
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));