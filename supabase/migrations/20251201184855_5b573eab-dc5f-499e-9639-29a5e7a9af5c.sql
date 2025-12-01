-- Restriction RLS : seul Admin et N+1 peuvent modifier role_agence
-- Cette politique assure que seul un utilisateur de niveau N+1 ou supérieur peut modifier le role_agence d'un utilisateur de niveau N

-- Drop existing policy if any
DROP POLICY IF EXISTS "Only N+1 or admin can update role_agence" ON public.profiles;

-- Create policy: Only users with higher role level can update role_agence of lower-level users
CREATE POLICY "Only N+1 or admin can update role_agence"
ON public.profiles
FOR UPDATE
USING (
  -- Admins (N5+) can update anyone's role_agence
  public.get_user_global_role_level(auth.uid()) >= 5
  OR
  -- N+1 rule: caller's role level must be strictly higher than target user's level
  public.get_user_global_role_level(auth.uid()) > public.get_user_global_role_level(id)
)
WITH CHECK (
  -- Same condition for the new values
  public.get_user_global_role_level(auth.uid()) >= 5
  OR
  public.get_user_global_role_level(auth.uid()) > public.get_user_global_role_level(id)
);