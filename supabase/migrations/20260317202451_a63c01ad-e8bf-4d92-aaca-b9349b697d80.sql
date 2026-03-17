-- Phase 1 corrections: snapshot versioning + validation traceability

-- 1. Add versioning & hash columns to snapshots
ALTER TABLE public.project_profitability_snapshots
  ADD COLUMN IF NOT EXISTS apogee_data_hash text,
  ADD COLUMN IF NOT EXISTS apogee_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_snapshot_id uuid REFERENCES public.project_profitability_snapshots(id),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 2. Add validation traceability to project_costs
ALTER TABLE public.project_costs
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 3. Replace absolute unique index with draft-only partial unique index
DROP INDEX IF EXISTS idx_pps_agency_project;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pps_agency_project_draft
  ON public.project_profitability_snapshots (agency_id, project_id)
  WHERE validation_status = 'draft';