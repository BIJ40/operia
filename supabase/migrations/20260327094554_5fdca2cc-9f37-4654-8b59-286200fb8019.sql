-- Étape 1: Supprimer rh_audit_log (FK NO ACTION bloquant)
DELETE FROM rh_audit_log WHERE collaborator_id IN (SELECT id FROM collaborators);

-- Étape 2: Supprimer hr_generated_documents liées aux collaborateurs (FK NO ACTION)
DELETE FROM hr_generated_documents WHERE collaborator_id IN (SELECT id FROM collaborators);

-- Étape 3: Purge totale des collaborateurs (CASCADE fait le reste)
DELETE FROM collaborators;

-- Étape 4: Nettoyer les profils N1
DELETE FROM profiles WHERE id IN (
  '0f9df9fe-36c0-47b2-af60-6430da50680c',
  '9c737e99-0fac-4bfa-b062-d4e95456df8f',
  '73261863-c985-4af8-9e22-a167f910507e'
);