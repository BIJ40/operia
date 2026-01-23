-- Enable RLS on archive tables
ALTER TABLE live_support_sessions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_support_messages_archive ENABLE ROW LEVEL SECURITY;

-- Policy: Only superadmin can access archives (for audit purposes)
CREATE POLICY "Super admins can view session archives"
ON live_support_sessions_archive
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.global_role = 'superadmin'
  )
);

CREATE POLICY "Super admins can view message archives"
ON live_support_messages_archive
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.global_role = 'superadmin'
  )
);