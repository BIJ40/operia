-- Ajouter la colonne service à support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN service text DEFAULT 'autre';

-- Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN public.support_tickets.service IS 'Service concerné: apogee, helpconfort, apporteurs, conseil, autre';