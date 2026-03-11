

## Plan: Audit complet des guards de permissions — Phase 4 Inventory

### Livrable unique

**Fichier**: `dev-reports/phase4-guards-inventory.md`

Rapport exhaustif contenant toutes les occurrences de guards dans le code applicatif, classées par type, avec identification legacy/nouvelle clé.

### Sources scannées

Tous les fichiers `.ts/.tsx` hors `node_modules`, `devtools`, et tests unitaires pour les patterns:
- `ModuleGuard moduleKey=` (routes)
- `requiresModule:` (config tabs/tiles)
- `hasModule(` (hooks/composants)
- `hasModuleOption(` (hooks/composants)
- `hasAccess(` (moteur + guards)
- `enabledModules[` (accès directs)
- `moduleGuard: {` (sitemapData config)
- `hasAccessToScope(` (scope-based guards)

### Contenu du rapport

Table complète avec ~120 occurrences identifiées dans ~30 fichiers, structurée:

```
| file | line | type | key | component |
```

Suivi du résumé demandé:
- Total guards
- Nombre legacy vs nouvelles clés
- Liste exhaustive des clés legacy détectées

### Classification des clés

**Legacy** (clés plates historiques): `ticketing`, `guides`, `agence`, `rh`, `stats`, `aide`, `realisations`, `prospection`, `parc`, `divers_apporteurs`, `divers_plannings`, `divers_reunions`, `divers_documents`, `admin_plateforme`, `reseau_franchiseur`

**Nouvelles** (clés Phase 4 hiérarchiques): `mediatheque.gerer`, `mediatheque.corbeille` (seules 2 détectées, dans DocumentsTabContent)

