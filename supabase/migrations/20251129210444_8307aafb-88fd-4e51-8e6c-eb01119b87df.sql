-- Table pour les pièces jointes des tickets Apogée
CREATE TABLE public.apogee_ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apogee_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view attachments"
ON public.apogee_ticket_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert attachments"
ON public.apogee_ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can delete own attachments"
ON public.apogee_ticket_attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role IN ('platform_admin', 'superadmin')
));

-- Storage bucket pour les pièces jointes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('apogee-ticket-attachments', 'apogee-ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'apogee-ticket-attachments');

CREATE POLICY "Authenticated can view ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'apogee-ticket-attachments');

CREATE POLICY "Authenticated can delete own ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'apogee-ticket-attachments');