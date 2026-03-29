-- BLOC 1: permissions_audit_log
CREATE TABLE permissions_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type    TEXT NOT NULL
    CHECK (scope_type IN (
      'user_access',
      'agency_module_entitlement',
      'plan_module_grant',
      'job_profile_preset'
    )),
  scope_id      TEXT,
  target_type   TEXT NOT NULL
    CHECK (target_type IN ('user', 'agency', 'plan', 'preset')),
  target_id     TEXT NOT NULL,
  module_key    TEXT,
  action_type   TEXT NOT NULL
    CHECK (action_type IN (
      'grant',
      'deny',
      'remove',
      'activate',
      'deactivate',
      'update_access_level',
      'reset_to_preset',
      'bulk_apply'
    )),
  old_value     JSONB,
  new_value     JSONB,
  reason        TEXT,
  actor_user_id UUID,
  actor_role    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE permissions_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY pal_select ON permissions_audit_log
  FOR SELECT TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      has_min_global_role(auth.uid(), 2)
      AND target_type = 'user'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id::text = target_id
          AND p.agency_id = get_user_agency_id(auth.uid())
      )
    )
  );

CREATE POLICY pal_insert ON permissions_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- BLOC 2: Trigger d'audit sur user_access
CREATE OR REPLACE FUNCTION log_user_access_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO permissions_audit_log (
      scope_type, target_type, target_id,
      module_key, action_type, new_value, actor_user_id
    )
    VALUES (
      'user_access', 'user', NEW.user_id::text,
      NEW.module_key,
      CASE WHEN NEW.granted THEN 'grant' ELSE 'deny' END,
      to_jsonb(NEW), NEW.granted_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO permissions_audit_log (
      scope_type, target_type, target_id,
      module_key, action_type, old_value, new_value, actor_user_id
    )
    VALUES (
      'user_access', 'user', NEW.user_id::text,
      NEW.module_key, 'update_access_level',
      to_jsonb(OLD), to_jsonb(NEW), NEW.granted_by
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO permissions_audit_log (
      scope_type, target_type, target_id,
      module_key, action_type, old_value
    )
    VALUES (
      'user_access', 'user', OLD.user_id::text,
      OLD.module_key, 'remove', to_jsonb(OLD)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ua_audit
  AFTER INSERT OR UPDATE OR DELETE ON user_access
  FOR EACH ROW EXECUTE FUNCTION log_user_access_changes();

-- BLOC 3: Test insert
INSERT INTO user_access (user_id, module_key, granted, source)
SELECT p.id, 'accueil', true, 'manual_exception'
FROM profiles p LIMIT 1
ON CONFLICT (user_id, module_key) DO NOTHING;

-- BLOC 3: Test delete
DELETE FROM user_access
WHERE module_key = 'accueil'
  AND source = 'manual_exception';