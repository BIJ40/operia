-- BLOC 1: billing_catalog
CREATE TABLE billing_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type    TEXT NOT NULL
    CHECK (item_type IN ('plan', 'module', 'option')),
  item_key     TEXT NOT NULL,
  label        TEXT,
  stripe_product_id TEXT,
  stripe_price_id   TEXT,
  billing_mode TEXT NOT NULL DEFAULT 'recurring'
    CHECK (billing_mode IN ('recurring', 'one_time', 'manual')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (item_type, item_key)
);

ALTER TABLE billing_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY bc_n5 ON billing_catalog
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- BLOC 2: Seed
INSERT INTO billing_catalog (item_type, item_key, label, billing_mode)
VALUES
  ('plan',   'core',                     'Plan CORE',             'recurring'),
  ('plan',   'pilot',                    'Plan PILOT',            'recurring'),
  ('plan',   'intelligence',             'Plan INTELLIGENCE',     'recurring'),
  ('option', 'commercial.suivi_client',  'Pack Suivi Client',     'recurring'),
  ('option', 'organisation.apporteurs',  'Portail Apporteur',     'recurring'),
  ('option', 'commercial.signature',     'Signature commerciale', 'recurring');