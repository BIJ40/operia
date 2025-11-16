-- Ajouter une colonne pour masquer le titre des TIPS
ALTER TABLE public.blocks ADD COLUMN hide_title boolean DEFAULT false;
ALTER TABLE public.apporteur_blocks ADD COLUMN hide_title boolean DEFAULT false;