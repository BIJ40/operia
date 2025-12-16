-- Drop existing check constraint and recreate with all existing values plus 'support'
ALTER TABLE public.apogee_tickets DROP CONSTRAINT IF EXISTS apogee_tickets_created_from_check;

ALTER TABLE public.apogee_tickets ADD CONSTRAINT apogee_tickets_created_from_check 
CHECK (created_from IN ('MANUAL', 'IMPORT', 'EXCEL', 'IMPORT_DYSFONCTIONNEMENTS', 'IMPORT_BUGS', 'IMPORT_TRAITE', 'support'));