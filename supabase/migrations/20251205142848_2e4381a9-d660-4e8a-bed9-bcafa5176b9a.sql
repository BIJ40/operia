-- RGPD-02: Table de gestion des consentements utilisateurs
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'cookies', 'data_processing', 'newsletter'
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version TEXT NOT NULL DEFAULT '1.0', -- Version des CGU/politique de confidentialité
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);

-- Trigger pour updated_at
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir et gérer leurs propres consentements
CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON public.user_consents FOR UPDATE
  USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les consentements (audit)
CREATE POLICY "Admins can view all consents"
  ON public.user_consents FOR SELECT
  USING (has_min_global_role(auth.uid(), 5));

-- Commentaires pour documentation
COMMENT ON TABLE public.user_consents IS 'RGPD Art. 7 - Tracking des consentements utilisateurs avec historique';
COMMENT ON COLUMN public.user_consents.consent_type IS 'Type: marketing, analytics, cookies, data_processing, newsletter';
COMMENT ON COLUMN public.user_consents.granted_at IS 'Date d''acceptation du consentement';
COMMENT ON COLUMN public.user_consents.withdrawn_at IS 'Date de retrait du consentement (null si actif)';
COMMENT ON COLUMN public.user_consents.version IS 'Version des CGU/politique au moment du consentement';