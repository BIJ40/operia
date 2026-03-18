
-- BLOC 5: Suppression des 4 clés fantômes commercial.* du module_registry
-- Ces clés n'ont aucun effet runtime (gatées par hasModuleOption('prospection', ...))
DELETE FROM module_registry WHERE key IN (
  'commercial.suivi_client',
  'commercial.comparateur',
  'commercial.veille',
  'commercial.prospects'
);
