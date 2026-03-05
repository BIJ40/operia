-- Table to store email recipients for ticket notifications
CREATE TABLE public.ticket_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: N5+ only
ALTER TABLE public.ticket_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "N5+ can read notification recipients"
  ON public.ticket_notification_recipients FOR SELECT
  TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));

CREATE POLICY "N5+ can insert notification recipients"
  ON public.ticket_notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (public.has_min_global_role(auth.uid(), 5));

CREATE POLICY "N5+ can update notification recipients"
  ON public.ticket_notification_recipients FOR UPDATE
  TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));

CREATE POLICY "N5+ can delete notification recipients"
  ON public.ticket_notification_recipients FOR DELETE
  TO authenticated
  USING (public.has_min_global_role(auth.uid(), 5));