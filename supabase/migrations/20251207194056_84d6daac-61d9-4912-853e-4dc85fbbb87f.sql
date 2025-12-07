-- Ajouter le flag "dirigeant salarié" pour les N2 qui sont aussi salariés
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_salaried_manager BOOLEAN DEFAULT false;

-- Commentaire explicatif
COMMENT ON COLUMN public.profiles.is_salaried_manager IS 'Si true, un dirigeant (N2) a accès au coffre-fort RH personnel comme un salarié N1';