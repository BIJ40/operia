-- Supprimer le champ pseudo de la table profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pseudo;

-- Supprimer la fonction get_email_from_pseudo qui n'est plus nécessaire
DROP FUNCTION IF EXISTS public.get_email_from_pseudo(text);