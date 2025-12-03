-- Table des notifications RH pour les salariés
CREATE TABLE IF NOT EXISTS public.rh_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('DOCUMENT_REQUEST_RESPONSE', 'NEW_DOCUMENT', 'CONTRACT_UPDATE')),
  title TEXT NOT NULL,
  message TEXT,
  related_request_id UUID REFERENCES public.document_requests(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES public.collaborator_documents(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_rh_notifications_collaborator ON public.rh_notifications(collaborator_id);
CREATE INDEX idx_rh_notifications_unread ON public.rh_notifications(collaborator_id, is_read) WHERE NOT is_read;

-- Enable RLS
ALTER TABLE public.rh_notifications ENABLE ROW LEVEL SECURITY;

-- Politique RLS: les salariés voient leurs propres notifications
CREATE POLICY "Users can view own notifications" 
ON public.rh_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM collaborators c 
    WHERE c.id = collaborator_id 
    AND c.user_id = auth.uid()
  )
);

-- Politique RLS: les salariés peuvent marquer comme lu
CREATE POLICY "Users can update own notifications" 
ON public.rh_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM collaborators c 
    WHERE c.id = collaborator_id 
    AND c.user_id = auth.uid()
  )
);

-- Politique RLS: les RH/dirigeants peuvent créer des notifications pour leur agence
CREATE POLICY "RH can create notifications" 
ON public.rh_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.agency_id = agency_id
    AND (
      p.global_role IN ('platform_admin', 'superadmin', 'franchisor_admin')
      OR (p.enabled_modules->'rh'->'options'->>'rh_admin')::boolean = true
      OR (p.enabled_modules->'rh'->'options'->>'rh_viewer')::boolean = true
    )
  )
);