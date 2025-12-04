-- Supprimer l'ancienne contrainte et en créer une nouvelle avec toutes les valeurs
ALTER TABLE apogee_tickets DROP CONSTRAINT IF EXISTS apogee_tickets_owner_side_check;

ALTER TABLE apogee_tickets ADD CONSTRAINT apogee_tickets_owner_side_check 
CHECK (owner_side IS NULL OR owner_side IN ('HC', 'APOGEE', 'PARTAGE', '75_25', '50_50', '25_75'));