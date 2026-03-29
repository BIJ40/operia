-- Bloc correctif : activer is_deployed pour 6 modules
UPDATE module_catalog SET is_deployed = true
WHERE key IN (
  'mediatheque.consulter',
  'mediatheque.corbeille',
  'mediatheque.documents',
  'mediatheque.gerer',
  'organisation.docgen',
  'organisation.parc'
);