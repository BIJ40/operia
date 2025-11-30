-- Allow users with apogee_tickets module to delete tickets
CREATE POLICY "Users with apogee_tickets module can delete tickets" 
ON public.apogee_tickets 
FOR DELETE 
USING (
  (( SELECT (((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean AS bool
     FROM profiles
    WHERE (profiles.id = auth.uid())) = true) 
  OR has_min_global_role(auth.uid(), 5)
);