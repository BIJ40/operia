-- Add workflow columns to existing timesheets table

-- Add entries columns for storing original and modified data
ALTER TABLE public.timesheets 
ADD COLUMN IF NOT EXISTS entries_original JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS entries_modified JSONB,
ADD COLUMN IF NOT EXISTS total_minutes_modified INTEGER,
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES apogee_agencies(id),
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_comment TEXT,
ADD COLUMN IF NOT EXISTS countersigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS countersigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS countersign_comment TEXT,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES profiles(id);

-- Update agency_id from collaborator if null
UPDATE public.timesheets t
SET agency_id = c.agency_id
FROM public.collaborators c
WHERE t.collaborator_id = c.id AND t.agency_id IS NULL;

-- Make agency_id NOT NULL after population
ALTER TABLE public.timesheets ALTER COLUMN agency_id SET NOT NULL;

-- Update status column to use new values (draft -> DRAFT, submitted -> SUBMITTED, approved -> VALIDATED)
UPDATE public.timesheets SET status = 'DRAFT' WHERE status = 'draft';
UPDATE public.timesheets SET status = 'SUBMITTED' WHERE status = 'submitted';
UPDATE public.timesheets SET status = 'VALIDATED' WHERE status = 'approved';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_timesheets_agency ON timesheets(agency_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);

-- Drop old policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can insert own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can update own timesheets" ON timesheets;

-- N1 can view their own timesheets
CREATE POLICY "N1 can view own timesheets"
ON timesheets FOR SELECT
USING (
  collaborator_id = get_current_collaborator_id()
  OR has_min_global_role(auth.uid(), 2)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND has_agency_rh_role(auth.uid(), agency_id)
  )
);

-- N1 can insert new timesheets
CREATE POLICY "N1 can insert timesheets"
ON timesheets FOR INSERT
WITH CHECK (
  collaborator_id = get_current_collaborator_id()
  AND agency_id = get_user_agency_id(auth.uid())
);

-- N1 can update DRAFT timesheets or countersign N2_MODIFIED
CREATE POLICY "N1 can update own timesheets"
ON timesheets FOR UPDATE
USING (
  collaborator_id = get_current_collaborator_id()
)
WITH CHECK (
  collaborator_id = get_current_collaborator_id()
);

-- N2+ can update for validation workflow
CREATE POLICY "N2 can validate timesheets"
ON timesheets FOR UPDATE
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
)
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

-- Enable realtime if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheets;