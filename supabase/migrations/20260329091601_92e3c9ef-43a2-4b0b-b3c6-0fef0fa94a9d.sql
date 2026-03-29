-- BLOC 1: module_catalog
CREATE TABLE module_catalog (
  key            TEXT PRIMARY KEY,
  parent_key     TEXT REFERENCES module_catalog(key) ON DELETE SET NULL,
  label          TEXT NOT NULL,
  display_type   TEXT,
  node_type      TEXT NOT NULL CHECK (node_type IN ('section','screen','feature')),
  description    TEXT,
  min_role       INT NOT NULL DEFAULT 0,
  is_deployed    BOOLEAN NOT NULL DEFAULT true,
  is_core        BOOLEAN NOT NULL DEFAULT false,
  is_delegatable BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  category       TEXT,
  preconditions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mc_upd
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON COLUMN module_catalog.display_type
  IS 'UI only — NEVER use in business logic or RLS';
COMMENT ON COLUMN module_catalog.is_core
  IS 'Ultra-rare — max 5 modules — N6 only';

ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY mc_select ON module_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mc_update ON module_catalog
  FOR UPDATE TO authenticated
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY mc_insert ON module_catalog
  FOR INSERT TO authenticated
  WITH CHECK (has_min_global_role(auth.uid(), 6));

CREATE POLICY mc_delete ON module_catalog
  FOR DELETE TO authenticated
  USING (has_min_global_role(auth.uid(), 6));

-- BLOC 2: module_distribution_rules
CREATE TABLE module_distribution_rules (
  module_key          TEXT PRIMARY KEY
                        REFERENCES module_catalog(key) ON DELETE CASCADE,
  via_plan            BOOLEAN NOT NULL DEFAULT false,
  via_agency_option   BOOLEAN NOT NULL DEFAULT false,
  via_user_assignment BOOLEAN NOT NULL DEFAULT false,
  stripe_sellable     BOOLEAN NOT NULL DEFAULT false,
  assignable_by_scope TEXT NOT NULL DEFAULT 'none'
    CHECK (assignable_by_scope IN ('none','platform_only','agency_admin','both')),
  activation_mode     TEXT NOT NULL DEFAULT 'manual_or_stripe'
    CHECK (activation_mode IN ('manual_only','stripe_only','manual_or_stripe'))
);

ALTER TABLE module_distribution_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY mdr_select ON module_distribution_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mdr_write ON module_distribution_rules
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- BLOC 6: app_feature_flags
CREATE TABLE app_feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT
);

ALTER TABLE app_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY aff_select ON app_feature_flags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY aff_write ON app_feature_flags
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));