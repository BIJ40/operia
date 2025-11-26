-- Allow admins to manage user roles (fix RLS error on insert/update)
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Optionally, also allow admins to view all roles explicitly (redundant with ALL but clearer)
-- (No-op if policy with same name already exists)
