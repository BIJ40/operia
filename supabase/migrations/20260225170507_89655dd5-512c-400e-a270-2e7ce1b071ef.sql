
-- Fix INSERT policy to support both legacy and new module systems
DROP POLICY "Users with apogee_tickets module can insert comments" ON apogee_ticket_comments;

CREATE POLICY "Users with apogee_tickets module can insert comments"
ON apogee_ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  has_min_global_role(auth.uid(), 5)
  OR (SELECT (((profiles.enabled_modules -> 'apogee_tickets') ->> 'enabled')::boolean) FROM profiles WHERE id = auth.uid()) = true
  OR has_module_v2(auth.uid(), 'apogee_tickets')
  OR has_module_v2(auth.uid(), 'ticketing')
);

-- Fix SELECT policy too for consistency
DROP POLICY "Users with apogee_tickets module can read comments" ON apogee_ticket_comments;

CREATE POLICY "Users with apogee_tickets module can read comments"
ON apogee_ticket_comments FOR SELECT
TO authenticated
USING (
  has_min_global_role(auth.uid(), 5)
  OR (SELECT (((profiles.enabled_modules -> 'apogee_tickets') ->> 'enabled')::boolean) FROM profiles WHERE id = auth.uid()) = true
  OR has_module_v2(auth.uid(), 'apogee_tickets')
  OR has_module_v2(auth.uid(), 'ticketing')
);
