-- Créer une fonction SECURITY DEFINER pour vérifier si un utilisateur a accès au module apogee_tickets
-- Cette fonction vérifie à la fois profiles.enabled_modules ET user_modules

CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Vérifier via enabled_modules dans profiles
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = _user_id
      AND (enabled_modules->'apogee_tickets'->>'enabled')::boolean = true
    )
    OR
    -- Vérifier via user_modules (l'existence d'une entrée = module activé)
    EXISTS (
      SELECT 1 FROM user_modules
      WHERE user_id = _user_id
      AND module_key = 'apogee_tickets'
    )
    OR
    -- N5+ a toujours accès
    has_min_global_role(_user_id, 5)
$$;

-- Mettre à jour les policies pour apogee_tickets
DROP POLICY IF EXISTS "Users can read tickets - superadmin bypass" ON public.apogee_tickets;
CREATE POLICY "Users can read tickets - superadmin bypass"
ON public.apogee_tickets
FOR SELECT
USING (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users can insert tickets - superadmin bypass" ON public.apogee_tickets;
CREATE POLICY "Users can insert tickets - superadmin bypass"
ON public.apogee_tickets
FOR INSERT
WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users can update tickets - superadmin bypass" ON public.apogee_tickets;
CREATE POLICY "Users can update tickets - superadmin bypass"
ON public.apogee_tickets
FOR UPDATE
USING (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users can delete tickets - superadmin bypass" ON public.apogee_tickets;
CREATE POLICY "Users can delete tickets - superadmin bypass"
ON public.apogee_tickets
FOR DELETE
USING (has_apogee_tickets_access(auth.uid()));

-- Mettre à jour les policies pour apogee_ticket_statuses
DROP POLICY IF EXISTS "Users with apogee_tickets module can read statuses" ON public.apogee_ticket_statuses;
CREATE POLICY "Users with apogee_tickets module can read statuses"
ON public.apogee_ticket_statuses
FOR SELECT
USING (has_apogee_tickets_access(auth.uid()));

-- Mettre à jour les policies pour apogee_modules
DROP POLICY IF EXISTS "Users with apogee_tickets module can read modules" ON public.apogee_modules;
CREATE POLICY "Users with apogee_tickets module can read modules"
ON public.apogee_modules
FOR SELECT
USING (has_apogee_tickets_access(auth.uid()));

-- Mettre à jour les policies pour apogee_priorities
DROP POLICY IF EXISTS "Users with apogee_tickets module can read priorities" ON public.apogee_priorities;
CREATE POLICY "Users with apogee_tickets module can read priorities"
ON public.apogee_priorities
FOR SELECT
USING (has_apogee_tickets_access(auth.uid()));

-- Mettre à jour les policies pour apogee_owner_sides
DROP POLICY IF EXISTS "Users with apogee_tickets module can read owner_sides" ON public.apogee_owner_sides;
CREATE POLICY "Users with apogee_tickets module can read owner_sides"
ON public.apogee_owner_sides
FOR SELECT
USING (has_apogee_tickets_access(auth.uid()));