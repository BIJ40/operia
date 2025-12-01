-- Ajouter le champ phone à la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;