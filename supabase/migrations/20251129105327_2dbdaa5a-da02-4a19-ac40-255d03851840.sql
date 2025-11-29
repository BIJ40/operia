-- Ajouter les champs pour la désactivation d'utilisateurs
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deactivated_by text NULL;

-- Index pour filtrer rapidement les utilisateurs actifs/inactifs
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Commentaire pour documentation
COMMENT ON COLUMN public.profiles.is_active IS 'Indique si le compte utilisateur est actif (soft delete)';
COMMENT ON COLUMN public.profiles.deactivated_at IS 'Date de désactivation du compte';
COMMENT ON COLUMN public.profiles.deactivated_by IS 'Email de l''admin ayant désactivé le compte';