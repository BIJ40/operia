-- Créer les politiques de stockage pour permettre aux support d'accéder aux pièces jointes

-- Politique pour que les support puissent lire les fichiers du bucket support-attachments
CREATE POLICY "Support staff can view all attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'support'::app_role) OR 
    has_role(auth.uid(), 'franchiseur'::app_role)
  )
);

-- Politique pour que les utilisateurs puissent lire leurs propres pièces jointes
CREATE POLICY "Users can view their ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 
    FROM support_tickets st
    JOIN support_attachments sa ON sa.ticket_id = st.id
    WHERE st.user_id = auth.uid()
    AND name LIKE st.id::text || '%'
  )
);