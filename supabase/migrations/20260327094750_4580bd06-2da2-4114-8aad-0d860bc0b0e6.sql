-- 1. Ajouter colonne poste aux deux tables
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS poste text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poste text;

-- 2. Migrer role → poste via whitelist stricte (collaborators)
UPDATE collaborators SET poste = CASE
  WHEN lower(role) IN ('plombier') THEN 'plombier'
  WHEN lower(role) IN ('electricien', 'électricien') THEN 'electricien'
  WHEN lower(role) IN ('menuisier') THEN 'menuisier'
  WHEN lower(role) IN ('peintre') THEN 'peintre'
  WHEN lower(role) IN ('plaquiste') THEN 'plaquiste'
  WHEN lower(role) IN ('polyvalent') THEN 'polyvalent'
  WHEN lower(role) IN ('secretaire', 'secrétaire') THEN 'secretaire'
  WHEN lower(role) IN ('commercial') THEN 'commercial'
  WHEN lower(role) IN ('gerant', 'gérant', 'dirigeant') THEN 'gerant'
  WHEN lower(role) IN ('president', 'président') THEN 'president'
  ELSE NULL
END
WHERE role IS NOT NULL;

-- 3. Renommer ASSISTANTE → ADMINISTRATIF dans collaborators.type
UPDATE collaborators SET type = 'ADMINISTRATIF' WHERE type = 'ASSISTANTE';

-- 4. Renommer assistante → administratif dans profiles.role_agence
UPDATE profiles SET role_agence = 'administratif' WHERE role_agence = 'assistante';

-- 5. Ajouter un commentaire sur le champ role (deprecated)
COMMENT ON COLUMN collaborators.role IS '@deprecated — utiliser poste. Lecture fallback uniquement.';

-- 6. Ajouter un commentaire sur le champ type
COMMENT ON COLUMN collaborators.type IS 'Fonction du collaborateur. Champ historique — canon métier = fonction. Valeurs : TECHNICIEN, ADMINISTRATIF, COMMERCIAL, DIRIGEANT, AUTRE.';