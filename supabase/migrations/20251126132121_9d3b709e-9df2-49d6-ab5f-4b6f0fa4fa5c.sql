-- Table pour l'historique des connexions
CREATE TABLE IF NOT EXISTS public.user_connection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_connection_logs_user_id ON public.user_connection_logs(user_id);
CREATE INDEX idx_connection_logs_connected_at ON public.user_connection_logs(connected_at DESC);

-- Enable RLS
ALTER TABLE public.user_connection_logs ENABLE ROW LEVEL SECURITY;

-- Admins peuvent voir tous les logs
CREATE POLICY "Admins can view all connection logs"
ON public.user_connection_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Les utilisateurs peuvent insérer leurs propres logs
CREATE POLICY "Users can insert their own connection logs"
ON public.user_connection_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent mettre à jour leurs propres logs
CREATE POLICY "Users can update their own connection logs"
ON public.user_connection_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_connection_logs;