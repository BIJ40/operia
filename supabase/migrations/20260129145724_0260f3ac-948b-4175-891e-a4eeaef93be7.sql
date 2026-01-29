-- =====================================================
-- AUTHENTIFICATION AUTONOME APPORTEUR - Phase 1
-- Tables: apporteur_managers, sessions, otp_codes, invitation_links
-- =====================================================

-- 1. Table apporteur_managers (remplace apporteur_users pour auth custom)
CREATE TABLE public.apporteur_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Un email peut gérer plusieurs apporteurs (différentes agences)
  CONSTRAINT apporteur_managers_unique_per_apporteur UNIQUE (apporteur_id, email)
);

-- Index pour recherche rapide par email (normalisé)
CREATE INDEX idx_apporteur_managers_email_lower ON public.apporteur_managers (lower(email));
CREATE INDEX idx_apporteur_managers_apporteur ON public.apporteur_managers (apporteur_id);
CREATE INDEX idx_apporteur_managers_agency ON public.apporteur_managers (agency_id);

-- Trigger updated_at
CREATE TRIGGER update_apporteur_managers_updated_at 
  BEFORE UPDATE ON public.apporteur_managers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Table apporteur_sessions (sessions custom, pas auth.users)
CREATE TABLE public.apporteur_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- SHA-256 du token, jamais le token en clair
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + 90 jours
  revoked_at TIMESTAMPTZ, -- NULL = session active
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour validation rapide du token
CREATE INDEX idx_apporteur_sessions_token ON public.apporteur_sessions (token_hash);
-- Index sur manager_id pour lookup des sessions
CREATE INDEX idx_apporteur_sessions_manager ON public.apporteur_sessions (manager_id);
-- Index partiel pour sessions non révoquées (IMMUTABLE condition)
CREATE INDEX idx_apporteur_sessions_active ON public.apporteur_sessions (manager_id) 
  WHERE revoked_at IS NULL;

-- 3. Table apporteur_otp_codes (codes 6 digits, TTL 15 min)
CREATE TABLE public.apporteur_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- SHA-256 du code 6 digits
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + 15 MINUTES
  used_at TIMESTAMPTZ, -- NULL = non utilisé
  ip_address INET, -- Pour rate limiting
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour validation OTP
CREATE INDEX idx_apporteur_otp_manager ON public.apporteur_otp_codes (manager_id);
-- Index partiel pour OTP non utilisés (IMMUTABLE condition)
CREATE INDEX idx_apporteur_otp_valid ON public.apporteur_otp_codes (manager_id, code_hash) 
  WHERE used_at IS NULL;

-- 4. Table apporteur_invitation_links (liens d'invitation longue durée 48h)
CREATE TABLE public.apporteur_invitation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- SHA-256 du token d'invitation
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + 48 HOURS
  used_at TIMESTAMPTZ, -- NULL = non utilisé
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apporteur_invites_token ON public.apporteur_invitation_links (token_hash);
CREATE INDEX idx_apporteur_invites_manager ON public.apporteur_invitation_links (manager_id);

-- 5. Modifier table apporteurs pour flag portal_enabled
ALTER TABLE public.apporteurs ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT false;

-- 6. RLS sur les nouvelles tables (accès via edge functions service role uniquement)
ALTER TABLE public.apporteur_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_invitation_links ENABLE ROW LEVEL SECURITY;

-- Politique: aucun accès direct sauf service role (edge functions)
CREATE POLICY "No direct access to apporteur_managers"
  ON public.apporteur_managers FOR ALL
  USING (false);

CREATE POLICY "No direct access to apporteur_sessions"
  ON public.apporteur_sessions FOR ALL
  USING (false);

CREATE POLICY "No direct access to apporteur_otp_codes"
  ON public.apporteur_otp_codes FOR ALL
  USING (false);

CREATE POLICY "No direct access to apporteur_invitation_links"
  ON public.apporteur_invitation_links FOR ALL
  USING (false);

-- 7. Fonction helper pour vérifier cohérence agency_id
CREATE OR REPLACE FUNCTION public.check_apporteur_manager_agency_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id != (SELECT a.agency_id FROM public.apporteurs a WHERE a.id = NEW.apporteur_id) THEN
    RAISE EXCEPTION 'agency_id mismatch: apporteur_managers.agency_id must match apporteurs.agency_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_manager_agency_consistency
  BEFORE INSERT OR UPDATE ON public.apporteur_managers
  FOR EACH ROW EXECUTE FUNCTION check_apporteur_manager_agency_consistency();

-- 8. Fonction pour nettoyer les OTP expirés (à appeler périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_apporteur_otps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.apporteur_otp_codes
  WHERE expires_at < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 9. Fonction pour nettoyer les sessions révoquées/expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_apporteur_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.apporteur_sessions
  WHERE (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days')
     OR (expires_at < now() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;