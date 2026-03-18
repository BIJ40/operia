

# Plan — Promouvoir les sous-onglets Commercial en modules indépendants

## Probleme

Suivi client, Comparateur, Veille, Prospects sont des **options** du module legacy `prospection`, pas des entrées distinctes dans `module_registry`. Consequences :
- Pas de ligne individuelle dans l'arbre des droits
- Impossible de deployer/cacher individuellement (ex: Veille en dev)
- Impossible d'overrider par utilisateur (ex: limiter Comparateur a certains profils)

Seul `commercial.realisations` est un vrai module independant.

## Solution

Creer 4 nouvelles cles dans `module_registry` : `commercial.suivi_client`, `commercial.comparateur`, `commercial.veille`, `commercial.prospects`. Migrer le frontend pour utiliser `hasModule()` au lieu de `hasModuleOption('prospection', ...)`.

## Modifications

### 1. Base de donnees — SQL migration

Inserer 4 lignes dans `module_registry` :

```sql
INSERT INTO module_registry (key, label, description, parent_key, is_deployed, min_role, required_plan)
VALUES
  ('commercial.suivi_client', 'Suivi client', 'Fiche apporteur et suivi', 'commercial', true, 'franchisee_user', 'PRO'),
  ('commercial.comparateur', 'Comparateur', 'Comparer apporteurs', 'commercial', true, 'franchisee_user', 'PRO'),
  ('commercial.veille', 'Veille', 'Monitoring apporteurs', 'commercial', true, 'franchisee_user', 'PRO'),
  ('commercial.prospects', 'Prospects', 'Gestion prospects', 'commercial', true, 'franchisee_user', 'PRO');
```

Migrer les `plan_tier_modules` existants : pour chaque tier ayant `prospection` avec `options_override`, creer les lignes `commercial.*` correspondantes.

### 2. `src/types/modules.ts`

- Ajouter les 4 cles dans `MODULE_KEYS`
- Ajouter dans `MODULE_DEFINITIONS` (ou retirer les options de la definition `prospection`)
- Ajouter dans `MODULE_LABELS`

### 3. `src/components/unified/tabs/CommercialTabContent.tsx`

Remplacer `TAB_OPTION_MAP` + `hasModuleOption('prospection', ...)` par `TAB_MODULE_MAP` + `hasModule(...)` :

```ts
const TAB_MODULE_MAP: Record<string, ModuleKey> = {
  apporteurs: 'commercial.suivi_client',
  comparateur: 'commercial.comparateur',
  veille: 'commercial.veille',
  prospects: 'commercial.prospects',
  realisations: 'commercial.realisations',
};
```

### 4. `src/prospection/pages/ProspectionTabContent.tsx`

Meme changement : remplacer `hasModuleOption` par `hasModule`.

### 5. `src/components/admin/views/rightsTaxonomy.ts`

Ajouter les 4 cles sous `commercial` :

```ts
{ id: 'commercial', label: 'Commercial', moduleKeys: [
  'commercial', 'prospection', 'commercial.suivi_client', 'commercial.comparateur',
  'commercial.veille', 'commercial.prospects', 'commercial.realisations',
]},
```

### 6. `src/config/headerNavigation.ts`

Ajouter `scope` sur les enfants Commercial pour que le dropdown applique la logique deployed/greyed :

```ts
{ label: 'Suivi client', scope: 'commercial.suivi_client', ... },
{ label: 'Comparateur', scope: 'commercial.comparateur', ... },
```

### 7. Retrocompatibilite

Le module `prospection` reste dans le registre comme conteneur parent (comme `pilotage`). Les anciennes donnees `plan_tier_modules` avec `options_override` continuent de fonctionner via le mapping dual-key existant dans `userModulesUtils.ts`, le temps que les tiers soient migres.

## Resultat

Chaque sous-onglet Commercial devient independamment :
- Deployable / cachable (`is_deployed`)
- Activable par plan (`plan_tier_modules`)
- Overridable par utilisateur (`user_modules`)
- Visible dans l'arbre des droits admin
- Greye ou cache dans la navigation selon la logique standard

