-- Now add IMPORT_TRAITE to the created_from check constraint
ALTER TABLE apogee_tickets 
DROP CONSTRAINT IF EXISTS apogee_tickets_created_from_check;

ALTER TABLE apogee_tickets 
ADD CONSTRAINT apogee_tickets_created_from_check 
CHECK (created_from IN ('MANUAL', 'IMPORT_BUGS', 'IMPORT_EVALUATED', 'IMPORT_TRAITE'));