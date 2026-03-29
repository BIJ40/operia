-- BLOC 1: agency_plan
CREATE TABLE agency_plan (
  agency_id   UUID PRIMARY KEY,
  plan_id     UUID NOT NULL REFERENCES plan_catalog(id),
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  assigned_by UUID REFERENCES profiles(id),
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER ap_upd
  BEFORE UPDATE ON agency_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE agency_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_select ON agency_plan
  FOR SELECT TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY ap_write ON agency_plan
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- BLOC 3: Migrer agency_subscription → agency_plan
INSERT INTO agency_plan (agency_id, plan_id, status, valid_from, assigned_by)
SELECT
  s.agency_id,
  CASE
    WHEN UPPER(s.tier_key) = 'PRO'
      THEN (SELECT id FROM plan_catalog WHERE key = 'pilot')
    ELSE
      (SELECT id FROM plan_catalog WHERE key = 'core')
  END,
  CASE s.status
    WHEN 'active' THEN 'active'
    ELSE 'suspended'
  END,
  s.valid_from,
  s.assigned_by
FROM agency_subscription s
WHERE s.status = 'active'
ON CONFLICT (agency_id) DO NOTHING;