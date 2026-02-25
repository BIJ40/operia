-- Harden comment insert policy: require author to be current authenticated user
DROP POLICY "Users with apogee_tickets module can insert comments" ON public.apogee_ticket_comments;

CREATE POLICY "Users with apogee_tickets module can insert comments"
ON public.apogee_ticket_comments
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    has_min_global_role(auth.uid(), 5)
    OR COALESCE((SELECT (((profiles.enabled_modules -> 'apogee_tickets') ->> 'enabled')::boolean) FROM public.profiles WHERE id = auth.uid()), false)
    OR has_module_v2(auth.uid(), 'apogee_tickets')
    OR has_module_v2(auth.uid(), 'ticketing')
  )
);