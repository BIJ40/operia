-- Ajouter un champ pseudo unique à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pseudo text UNIQUE;

-- Créer un index pour optimiser les recherches par pseudo
CREATE INDEX IF NOT EXISTS idx_profiles_pseudo ON public.profiles(pseudo);

-- Ajouter une contrainte pour s'assurer que le pseudo n'est pas vide
ALTER TABLE public.profiles 
ADD CONSTRAINT check_pseudo_not_empty 
CHECK (pseudo IS NULL OR length(trim(pseudo)) > 0);