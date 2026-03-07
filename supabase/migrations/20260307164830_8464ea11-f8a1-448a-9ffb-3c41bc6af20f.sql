
CREATE TABLE public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  company_name text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit registration"
  ON public.pending_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read registrations"
  ON public.pending_registrations FOR SELECT
  TO authenticated
  USING (has_min_global_role(auth.uid(), 3));

CREATE POLICY "Admins can update registrations"
  ON public.pending_registrations FOR UPDATE
  TO authenticated
  USING (has_min_global_role(auth.uid(), 3))
  WITH CHECK (has_min_global_role(auth.uid(), 3));

CREATE POLICY "Admins can delete registrations"
  ON public.pending_registrations FOR DELETE
  TO authenticated
  USING (has_min_global_role(auth.uid(), 3));
