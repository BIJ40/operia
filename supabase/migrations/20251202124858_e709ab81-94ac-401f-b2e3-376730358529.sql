-- Update the check constraint to include IMPORT_DYSFONCTIONNEMENTS
ALTER TABLE public.apogee_tickets DROP CONSTRAINT IF EXISTS apogee_tickets_created_from_check;

ALTER TABLE public.apogee_tickets ADD CONSTRAINT apogee_tickets_created_from_check 
CHECK (created_from IN ('MANUAL', 'IMPORT_EVALUATED', 'IMPORT_BUGS', 'IMPORT_TRAITE', 'IMPORT_DYSFONCTIONNEMENTS'));