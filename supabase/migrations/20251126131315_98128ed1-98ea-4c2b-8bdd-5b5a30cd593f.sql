-- Table pour stocker les alertes de quota localStorage
CREATE TABLE IF NOT EXISTS public.storage_quota_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_agence TEXT,
  quota_used_bytes BIGINT NOT NULL,
  quota_total_bytes BIGINT NOT NULL,
  percentage_used NUMERIC(5,2) NOT NULL,
  cache_keys JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_storage_quota_alerts_created_at ON public.storage_quota_alerts(created_at DESC);
CREATE INDEX idx_storage_quota_alerts_user_id ON public.storage_quota_alerts(user_id);

-- Enable RLS
ALTER TABLE public.storage_quota_alerts ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all storage quota alerts"
ON public.storage_quota_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Les utilisateurs peuvent insérer leurs propres alertes
CREATE POLICY "Users can insert their own storage quota alerts"
ON public.storage_quota_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);