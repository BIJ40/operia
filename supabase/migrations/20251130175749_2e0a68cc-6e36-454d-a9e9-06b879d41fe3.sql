-- First, drop the existing priority constraint
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;

-- Update old priority values to new ones
UPDATE public.support_tickets SET priority = 'mineur' WHERE priority = 'low';
UPDATE public.support_tickets SET priority = 'important' WHERE priority = 'high';

-- Add new priority constraint with correct values
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_priority_check 
CHECK (priority = ANY (ARRAY['mineur'::text, 'normal'::text, 'important'::text, 'urgent'::text, 'bloquant'::text]));