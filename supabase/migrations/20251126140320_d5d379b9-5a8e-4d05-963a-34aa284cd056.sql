-- Phase 1.2 : Étendre la table support_tickets
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'chat',
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS agency_slug text,
ADD COLUMN IF NOT EXISTS has_attachments boolean NOT NULL DEFAULT false;

-- Phase 1.3 : Créer la table support_attachments
CREATE TABLE IF NOT EXISTS support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS pour support_attachments
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les pièces jointes de leurs propres tickets
CREATE POLICY "Users can view attachments of their tickets"
ON support_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = support_attachments.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Support/franchiseur/admin peuvent voir toutes les pièces jointes
CREATE POLICY "Support staff can view all attachments"
ON support_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'support'::app_role) OR
  has_role(auth.uid(), 'franchiseur'::app_role)
);

-- Seul le système peut créer des pièces jointes (via edge function)
CREATE POLICY "Authenticated users can insert attachments"
ON support_attachments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Phase 1.4 : Créer le bucket storage support-attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket support-attachments
-- Les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Les utilisateurs peuvent télécharger les pièces jointes de leurs tickets
CREATE POLICY "Users can download their ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  (
    -- Fichier appartient à un ticket de l'utilisateur
    EXISTS (
      SELECT 1 FROM support_attachments sa
      JOIN support_tickets st ON st.id = sa.ticket_id
      WHERE sa.file_path = name
      AND st.user_id = auth.uid()
    )
    OR
    -- Ou l'utilisateur est support/franchiseur/admin
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'support'::app_role) OR
    has_role(auth.uid(), 'franchiseur'::app_role)
  )
);

-- Phase 1.5 : Mettre à jour les RLS de support_tickets pour franchiseur
CREATE POLICY "Franchiseur can manage all tickets"
ON support_tickets
FOR ALL
USING (
  has_role(auth.uid(), 'franchiseur'::app_role)
);