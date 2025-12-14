-- Table des notifications de planning
CREATE TABLE public.planning_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  tech_id INTEGER NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('PLANNING_SENT', 'PLANNING_SIGNED')),
  week_start DATE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes
CREATE INDEX idx_planning_notifications_recipient ON public.planning_notifications(recipient_user_id, is_read);
CREATE INDEX idx_planning_notifications_agency ON public.planning_notifications(agency_id);

-- Activer RLS
ALTER TABLE public.planning_notifications ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own planning notifications"
ON public.planning_notifications
FOR SELECT
USING (recipient_user_id = auth.uid());

-- Politique : les utilisateurs authentifiés peuvent créer des notifications
CREATE POLICY "Authenticated users can create planning notifications"
ON public.planning_notifications
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Politique : les utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can update their own planning notifications"
ON public.planning_notifications
FOR UPDATE
USING (recipient_user_id = auth.uid());

-- Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_notifications;