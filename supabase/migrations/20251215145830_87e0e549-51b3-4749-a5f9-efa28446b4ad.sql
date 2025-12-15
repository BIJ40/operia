-- Add new statuses for vehicle/equipment workflow
ALTER TABLE rh_requests DROP CONSTRAINT IF EXISTS rh_requests_status_check;
ALTER TABLE rh_requests ADD CONSTRAINT rh_requests_status_check 
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'SEEN', 'PROCESSED'));

-- Add column for processing info (date RDV garage, etc.)
ALTER TABLE rh_requests ADD COLUMN IF NOT EXISTS processing_info JSONB DEFAULT NULL;

-- Add column for seen timestamp
ALTER TABLE rh_requests ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rh_requests ADD COLUMN IF NOT EXISTS seen_by UUID REFERENCES profiles(id) DEFAULT NULL;