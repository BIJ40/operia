

# Ajouter `reseau_franchiseur` et `admin_plateforme` au registre des modules

## Constat

La table `module_registry` ne contient que les 7 modules "classiques" (stats, salaries, outils, documents, guides, ticketing, aide). Il manque :

- **`reseau_franchiseur`** — module Franchiseur (N3+) avec 5 sous-modules : dashboard, stats, agences, redevances, comparatifs
- **`admin_plateforme`** — module Admin plateforme (N5+), pas de sous-modules définis

Ces modules existent dans `MODULE_DEFINITIONS` (types/modules.ts) et dans `feature_flags`, mais pas dans le registre qui alimente l'écran "Droits".

## Plan

### Migration SQL unique

```sql
-- Ajout de reseau_franchiseur (sort_order 80, après aide=70)
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('reseau_franchiseur', 'Réseau Franchiseur', NULL, 'section', 80, true, 'PRO', 3);

-- Enfants
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('reseau_franchiseur.dashboard',   'Dashboard',    'reseau_franchiseur', 'screen',  1, true,  'PRO', 3),
  ('reseau_franchiseur.stats',       'Stats',        'reseau_franchiseur', 'screen',  2, true,  'PRO', 3),
  ('reseau_franchiseur.agences',     'Agences',      'reseau_franchiseur', 'screen',  3, true,  'PRO', 3),
  ('reseau_franchiseur.redevances',  'Redevances',   'reseau_franchiseur', 'screen',  4, false, 'PRO', 4),
  ('reseau_franchiseur.comparatifs', 'Comparatifs',  'reseau_franchiseur', 'screen',  5, true,  'PRO', 3);

-- Ajout de admin_plateforme (sort_order 90)
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('admin_plateforme', 'Administration', NULL, 'section', 90, true, 'PRO', 5);
```

Valeurs `min_role` basées sur le hardcode actuel :
- `reseau_franchiseur.*` → 3 (franchisor_user / N3)
- `reseau_franchiseur.redevances` → 4 (franchisor_admin / N4)
- `admin_plateforme` → 5 (platform_admin / N5)

### Aucun changement UI

Le `ModulesMasterView` lit déjà tout l'arbre `module_registry` dynamiquement. Les nouveaux nœuds apparaîtront automatiquement dans l'écran "Droits" après la migration.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Nouvelle migration SQL | INSERT des 7 lignes manquantes |

