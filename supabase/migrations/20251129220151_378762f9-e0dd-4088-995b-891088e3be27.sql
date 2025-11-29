-- Ajout colonnes pour historique de qualification (textes originaux)
ALTER TABLE public.apogee_tickets
ADD COLUMN IF NOT EXISTS original_title TEXT,
ADD COLUMN IF NOT EXISTS original_description TEXT;

-- Commentaire explicatif
COMMENT ON COLUMN public.apogee_tickets.original_title IS 'Titre original avant qualification IA';
COMMENT ON COLUMN public.apogee_tickets.original_description IS 'Description originale avant qualification IA';