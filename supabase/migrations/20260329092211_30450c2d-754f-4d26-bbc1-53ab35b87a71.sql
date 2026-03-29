-- BLOC 1: agency_module_entitlements
CREATE TABLE agency_module_entitlements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL,
  module_key   TEXT NOT NULL REFERENCES module_catalog(key) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'stripe', 'included', 'trial')),
  access_level TEXT NOT NULL DEFAULT 'full'
    CHECK (access_level IN ('none', 'read', 'full')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id              TEXT,
  stripe_subscription_item_id  TEXT,
  activated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by   UUID REFERENCES profiles(id),
  expires_at     TIMESTAMPTZ,
  trial_ends_at  TIMESTAMPTZ,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (agency_id, module_key)
);

ALTER TABLE agency_module_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ame_select ON agency_module_entitlements
  FOR SELECT TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY ame_write ON agency_module_entitlements
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- BLOC 3: Migrer agency_features → agency_module_entitlements
INSERT INTO agency_module_entitlements (agency_id, module_key, source, is_active, activated_at)
SELECT
  af.agency_id,
  CASE af.feature_key
    WHEN 'suivi_client'       THEN 'commercial.suivi_client'
    WHEN 'apporteur_portal'   THEN 'organisation.apporteurs'
    WHEN 'apporteur_exchange' THEN 'organisation.apporteurs'
    ELSE af.feature_key
  END,
  'manual',
  (af.status = 'active'),
  af.activated_at
FROM agency_features af
WHERE af.feature_key IN ('suivi_client', 'apporteur_portal', 'apporteur_exchange')
   OR af.feature_key IN (SELECT key FROM module_catalog)
ON CONFLICT (agency_id, module_key) DO NOTHING;