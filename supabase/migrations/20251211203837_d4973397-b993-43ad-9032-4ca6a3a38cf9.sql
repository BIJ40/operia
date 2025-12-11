-- Table d'audit pour accès aux données sensibles (RGPD compliance)
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  agency_slug TEXT NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'client_contact',
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes d'audit fréquentes
CREATE INDEX idx_sensitive_logs_user ON public.sensitive_data_access_logs(user_id);
CREATE INDEX idx_sensitive_logs_accessed_at ON public.sensitive_data_access_logs(accessed_at DESC);
CREATE INDEX idx_sensitive_logs_agency ON public.sensitive_data_access_logs(agency_slug);

-- Enable RLS
ALTER TABLE public.sensitive_data_access_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS: seuls les admins peuvent lire les logs, insertion via Edge Function (service role)
CREATE POLICY "Admins can view all access logs"
  ON public.sensitive_data_access_logs
  FOR SELECT
  USING (has_min_global_role(auth.uid(), 5));

-- Permettre l'insertion depuis les Edge Functions (via service role ou JWT valide)
CREATE POLICY "Authenticated users can insert own logs"
  ON public.sensitive_data_access_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Commentaire pour documentation
COMMENT ON TABLE public.sensitive_data_access_logs IS 'Audit trail pour accès aux données sensibles clients (conformité RGPD)';