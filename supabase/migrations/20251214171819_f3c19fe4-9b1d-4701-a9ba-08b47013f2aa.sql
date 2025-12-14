-- Drop old constraint and add new one with CANCELLED status
ALTER TABLE public.rh_requests DROP CONSTRAINT IF EXISTS rh_requests_status_check;

ALTER TABLE public.rh_requests ADD CONSTRAINT rh_requests_status_check 
  CHECK (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text]));