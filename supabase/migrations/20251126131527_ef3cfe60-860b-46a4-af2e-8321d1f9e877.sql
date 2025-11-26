-- Table pour tracker la présence de tous les utilisateurs
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_user_presence_status ON public.user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON public.user_presence(last_seen DESC);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifiés peuvent voir la présence
CREATE POLICY "Authenticated users can view presence"
ON public.user_presence
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent gérer leur propre présence
CREATE POLICY "Users can manage their own presence"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins peuvent voir toutes les présences
CREATE POLICY "Admins can view all presence"
ON public.user_presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;