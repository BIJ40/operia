
-- Drop existing constraints
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_scope_check;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS valid_reference;

-- Add updated scope constraint with all valid values
ALTER TABLE public.documents ADD CONSTRAINT documents_scope_check 
CHECK (scope IN ('apogee', 'apporteur', 'helpconfort', 'autre'));

-- Add updated valid_reference constraint (block_id/apporteur_block_id can both be null for helpconfort/autre)
ALTER TABLE public.documents ADD CONSTRAINT valid_reference 
CHECK (
  (scope = 'apogee' AND block_id IS NOT NULL AND apporteur_block_id IS NULL) OR
  (scope = 'apporteur' AND apporteur_block_id IS NOT NULL AND block_id IS NULL) OR
  (scope IN ('helpconfort', 'autre'))
);
