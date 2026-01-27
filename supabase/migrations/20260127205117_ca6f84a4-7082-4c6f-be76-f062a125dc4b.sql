-- Table pour stocker les subscriptions push de chaque utilisateur
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Un utilisateur peut avoir plusieurs devices
  UNIQUE(user_id, endpoint)
);

-- Index pour recherche rapide par user_id
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id) WHERE is_active = true;

-- Trigger pour updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Table pour les notifications in-app unifiées
CREATE TABLE public.unified_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE SET NULL,
  
  -- Type et source
  category TEXT NOT NULL, -- 'support', 'epi', 'rh', 'system', 'apogee'
  notification_type TEXT NOT NULL, -- ex: 'ticket_created', 'ack_signed', 'leave_approved'
  
  -- Contenu
  title TEXT NOT NULL,
  message TEXT,
  icon TEXT, -- lucide icon name
  
  -- Liens
  action_url TEXT,
  related_entity_type TEXT, -- 'support_ticket', 'epi_request', 'leave_request'
  related_entity_id UUID,
  
  -- État
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_pushed BOOLEAN NOT NULL DEFAULT false,
  pushed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ -- null = never expires
);

-- Index pour recherche
CREATE INDEX idx_unified_notifications_user_unread ON public.unified_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_unified_notifications_user_created ON public.unified_notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.unified_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON public.unified_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.unified_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins et système peuvent créer des notifications pour n'importe qui
CREATE POLICY "System can insert notifications"
  ON public.unified_notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_notifications;

-- Function pour créer une notification et optionnellement envoyer un push
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_category TEXT,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_agency_id UUID;
BEGIN
  -- Récupérer l'agence de l'utilisateur
  SELECT agency_id INTO v_agency_id FROM profiles WHERE id = p_user_id;
  
  INSERT INTO unified_notifications (
    user_id, agency_id, category, notification_type, title, message, icon,
    action_url, related_entity_type, related_entity_id, metadata
  ) VALUES (
    p_user_id, v_agency_id, p_category, p_notification_type, p_title, p_message, p_icon,
    p_action_url, p_related_entity_type, p_related_entity_id, p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function pour compter les notifications non lues
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM unified_notifications
  WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- Function pour marquer comme lu
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE unified_notifications
  SET is_read = true, read_at = now()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;