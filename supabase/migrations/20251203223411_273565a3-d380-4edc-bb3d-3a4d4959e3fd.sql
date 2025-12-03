
-- Recréer la fonction de sync collaborators → profiles (la plus récente prime)
CREATE OR REPLACE FUNCTION sync_profile_on_collaborator_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync vers profiles si user_id est défini
  IF NEW.user_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer la fonction de sync profiles → collaborators
CREATE OR REPLACE FUNCTION sync_collaborator_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE collaborators
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    email = NEW.email,
    phone = NEW.phone,
    updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Corriger les données: collaborators.updated_at > profiles.updated_at → collaborator prime
UPDATE profiles p
SET 
  first_name = c.first_name,
  last_name = c.last_name,
  email = COALESCE(c.email, p.email),
  phone = COALESCE(c.phone, p.phone),
  updated_at = now()
FROM collaborators c
WHERE c.user_id = p.id
AND c.user_id IS NOT NULL
AND c.updated_at > p.updated_at
AND (
  c.first_name IS DISTINCT FROM p.first_name OR
  c.last_name IS DISTINCT FROM p.last_name
);

-- Et inversement: profiles.updated_at >= collaborators.updated_at → profile prime
UPDATE collaborators c
SET 
  first_name = p.first_name,
  last_name = p.last_name,
  email = p.email,
  phone = p.phone,
  updated_at = now()
FROM profiles p
WHERE c.user_id = p.id
AND c.user_id IS NOT NULL
AND p.updated_at >= c.updated_at
AND (
  c.first_name IS DISTINCT FROM p.first_name OR
  c.last_name IS DISTINCT FROM p.last_name
);
