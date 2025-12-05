-- Créer le trigger pour auto_create_collaborator (sur INSERT ET UPDATE)
DROP TRIGGER IF EXISTS trigger_auto_create_collaborator ON profiles;

CREATE TRIGGER trigger_auto_create_collaborator
  AFTER INSERT OR UPDATE OF agency_id ON profiles
  FOR EACH ROW
  WHEN (NEW.agency_id IS NOT NULL)
  EXECUTE FUNCTION auto_create_collaborator();

-- Créer manuellement le collaborateur manquant pour Maxime Pasquier
INSERT INTO collaborators (
  agency_id,
  user_id,
  first_name,
  last_name,
  email,
  is_registered_user,
  type,
  role
)
SELECT 
  p.agency_id,
  p.id,
  COALESCE(p.first_name, ''),
  COALESCE(p.last_name, ''),
  p.email,
  true,
  CASE 
    WHEN LOWER(p.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
    WHEN LOWER(p.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
    WHEN LOWER(p.role_agence) LIKE '%dirig%' THEN 'DIRIGEANT'
    WHEN LOWER(p.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
    ELSE 'AUTRE'
  END,
  COALESCE(NULLIF(p.role_agence, ''), 'autre')
FROM profiles p
WHERE p.id = 'fff5ac73-a53a-469f-bde4-d49eaabf1667'
  AND NOT EXISTS (SELECT 1 FROM collaborators c WHERE c.user_id = p.id)
ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO NOTHING;