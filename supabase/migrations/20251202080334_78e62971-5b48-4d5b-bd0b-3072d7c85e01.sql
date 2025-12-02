-- Modifier le champ date_cloture_bilan pour stocker seulement mois-jour (format MM-DD)
ALTER TABLE public.apogee_agencies
DROP COLUMN IF EXISTS date_cloture_bilan;

ALTER TABLE public.apogee_agencies
ADD COLUMN date_cloture_bilan VARCHAR(5);