-- CORRECTION CRITIQUE: Les politiques RLS doivent respecter la règle absolue superadmin
-- Suppression des anciennes politiques restrictives
DROP POLICY IF EXISTS "Users with apogee_tickets module can read tickets" ON apogee_tickets;
DROP POLICY IF EXISTS "Users with apogee_tickets module can insert tickets" ON apogee_tickets;
DROP POLICY IF EXISTS "Users with apogee_tickets module can update tickets" ON apogee_tickets;
DROP POLICY IF EXISTS "Users with apogee_tickets module can delete tickets" ON apogee_tickets;

-- Nouvelles politiques avec RÈGLE ABSOLUE: N5+ ont TOUS les droits
CREATE POLICY "Users can read tickets - superadmin bypass"
ON apogee_tickets FOR SELECT
USING (
  -- RÈGLE ABSOLUE: N5+ voient tout
  has_min_global_role(auth.uid(), 5)
  OR
  -- Autres utilisateurs: module apogee_tickets activé
  (
    SELECT (((enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean
    FROM profiles
    WHERE id = auth.uid()
  ) = true
);

CREATE POLICY "Users can insert tickets - superadmin bypass"
ON apogee_tickets FOR INSERT
WITH CHECK (
  -- RÈGLE ABSOLUE: N5+ peuvent tout insérer
  has_min_global_role(auth.uid(), 5)
  OR
  -- Autres utilisateurs: module apogee_tickets activé
  (
    SELECT (((enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean
    FROM profiles
    WHERE id = auth.uid()
  ) = true
);

CREATE POLICY "Users can update tickets - superadmin bypass"
ON apogee_tickets FOR UPDATE
USING (
  -- RÈGLE ABSOLUE: N5+ peuvent tout modifier
  has_min_global_role(auth.uid(), 5)
  OR
  -- Autres utilisateurs: module apogee_tickets activé
  (
    SELECT (((enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean
    FROM profiles
    WHERE id = auth.uid()
  ) = true
);

CREATE POLICY "Users can delete tickets - superadmin bypass"
ON apogee_tickets FOR DELETE
USING (
  -- RÈGLE ABSOLUE: N5+ peuvent tout supprimer
  has_min_global_role(auth.uid(), 5)
  OR
  -- Autres utilisateurs: module apogee_tickets activé
  (
    SELECT (((enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean
    FROM profiles
    WHERE id = auth.uid()
  ) = true
);