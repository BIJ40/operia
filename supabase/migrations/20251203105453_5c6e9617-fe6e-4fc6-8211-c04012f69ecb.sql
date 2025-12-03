-- Ensure user_id has unique constraint (1 collaborator = 1 profile max)
-- Using partial unique index since user_id is nullable
CREATE UNIQUE INDEX IF NOT EXISTS collaborators_user_id_unique 
ON collaborators(user_id) 
WHERE user_id IS NOT NULL;

-- Verify agency_id is NOT NULL (should already be the case, but ensure it)
ALTER TABLE collaborators ALTER COLUMN agency_id SET NOT NULL;