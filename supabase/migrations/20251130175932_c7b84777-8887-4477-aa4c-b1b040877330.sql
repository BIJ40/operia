-- Drop the old status constraint
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;

-- Add new status constraint with V2 values
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check 
CHECK (status = ANY (ARRAY['new'::text, 'in_progress'::text, 'waiting_user'::text, 'resolved'::text, 'closed'::text]));