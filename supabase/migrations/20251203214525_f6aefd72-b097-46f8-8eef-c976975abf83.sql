-- Add birth_place column for lieu de naissance
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS birth_place TEXT NULL;