-- Ajouter les colonnes permis et cni à la table collaborators
ALTER TABLE public.collaborators 
ADD COLUMN IF NOT EXISTS permis TEXT,
ADD COLUMN IF NOT EXISTS cni TEXT;