-- Ajouter une colonne reported_by pour distinguer le rapporteur du propriétaire
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS reported_by TEXT;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.apogee_tickets.reported_by IS 'Personne ayant rapporté/identifié le ticket (ex: JEROME, FLORIAN, ERIC, APOGEE, AUTRE)';