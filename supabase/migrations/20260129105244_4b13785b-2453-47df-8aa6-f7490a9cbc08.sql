
-- ============================================================================
-- SECURITY FIX: Restrict plan_tiers access to authenticated users
-- ============================================================================

-- Drop the public read policies
DROP POLICY IF EXISTS "Anyone can read plans" ON plan_tiers;
DROP POLICY IF EXISTS "Anyone can read plan modules" ON plan_tier_modules;

-- Create authenticated-only read policies
CREATE POLICY "Authenticated users can read plan tiers"
ON plan_tiers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read plan tier modules"
ON plan_tier_modules FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- SECURITY FIX: Add audit trail for sensitive HR data access
-- ============================================================================

-- Create audit log table for salary data access
CREATE TABLE IF NOT EXISTS public.salary_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete'
  table_name TEXT NOT NULL, -- 'salary_history' or 'employment_contracts'
  record_id UUID NOT NULL,
  contract_id UUID, -- For salary_history records
  employee_user_id UUID, -- The user whose data was accessed
  agency_id UUID,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_salary_access_audit_user ON salary_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_access_audit_employee ON salary_access_audit(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_salary_access_audit_agency ON salary_access_audit(agency_id);
CREATE INDEX IF NOT EXISTS idx_salary_access_audit_date ON salary_access_audit(accessed_at DESC);

-- Enable RLS on audit table
ALTER TABLE salary_access_audit ENABLE ROW LEVEL SECURITY;

-- Only N5+ can read audit logs (for compliance review)
CREATE POLICY "N5+ can read salary audit logs"
ON salary_access_audit FOR SELECT
TO authenticated
USING (has_min_global_role(auth.uid(), 5));

-- Authenticated users can insert their own audit logs
CREATE POLICY "Users can create audit entries"
ON salary_access_audit FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create function to log salary data access
CREATE OR REPLACE FUNCTION log_salary_access(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_contract_id UUID DEFAULT NULL,
  p_employee_user_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO salary_access_audit (
    user_id,
    action,
    table_name,
    record_id,
    contract_id,
    employee_user_id,
    agency_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_contract_id,
    p_employee_user_id,
    p_agency_id,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_salary_access TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE salary_access_audit IS 'Audit trail for access to sensitive salary and compensation data. Required for compliance and security monitoring.';
COMMENT ON FUNCTION log_salary_access IS 'Logs access to salary data for audit compliance. Call this when viewing, creating, updating, or deleting salary/contract records.';
