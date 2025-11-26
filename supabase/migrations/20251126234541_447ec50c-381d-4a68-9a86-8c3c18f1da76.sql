-- Table pour stocker les configurations de délais personnalisés par utilisateur
CREATE TABLE IF NOT EXISTS public.user_actions_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Délais en jours pour chaque type d'action
  delai_devis_a_faire INTEGER NOT NULL DEFAULT 2,
  delai_devis_envoye INTEGER NOT NULL DEFAULT 10,
  delai_a_facturer INTEGER NOT NULL DEFAULT 3,
  delai_a_commander INTEGER NOT NULL DEFAULT 10,
  delai_facture_non_reglee INTEGER NOT NULL DEFAULT 3,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un utilisateur ne peut avoir qu'une seule configuration
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE public.user_actions_config ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir et gérer leur propre configuration
CREATE POLICY "Users can view their own actions config"
  ON public.user_actions_config
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own actions config"
  ON public.user_actions_config
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions config"
  ON public.user_actions_config
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all actions configs"
  ON public.user_actions_config
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_user_actions_config_updated_at
  BEFORE UPDATE ON public.user_actions_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les recherches par user_id
CREATE INDEX idx_user_actions_config_user_id ON public.user_actions_config(user_id);