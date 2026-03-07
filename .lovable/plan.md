

# Plan d'execution : Ecran Maitre module_registry

## Resume

Remplacement du systeme actuel (matrice `plan_tier_modules` + `MODULE_DEFINITIONS` plat) par une table `module_registry` arborescente et un ecran maitre unique. Chaque noeud porte `is_deployed` et `required_plan`, avec heritage parent→enfant calcule cote client.

## Etape 1 — Migration SQL

### Table `module_registry`

```sql
CREATE TABLE module_registry (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_key TEXT REFERENCES module_registry(key) ON DELETE RESTRICT,
  node_type TEXT NOT NULL CHECK (node_type IN ('section', 'screen', 'feature')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deployed BOOLEAN NOT NULL DEFAULT true,
  required_plan TEXT NOT NULL DEFAULT 'STARTER' CHECK (required_plan IN ('STARTER', 'PRO'))
);

ALTER TABLE module_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "N4+ can read module_registry"
  ON module_registry FOR SELECT TO authenticated
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N5+ can update module_registry"
  ON module_registry FOR UPDATE TO authenticated
  USING (has_min_global_role(auth.uid(), 5));
```

Regles :
- `ON DELETE RESTRICT` (pas CASCADE) — la suppression physique est hors perimetre
- Pas de politique INSERT/DELETE — la creation/suppression de noeuds se fait uniquement en migration SQL

### Seed (~40 noeuds)

Insert de l'arbre canonique complet derive de la navigation reelle : stats, salaries, outils (actions, apporteurs, administratif, parc, performance, commercial), documents, guides, ticketing, aide. Chaque noeud avec son `node_type`, `required_plan`, `is_deployed` et `sort_order`.

### RPC `get_user_effective_modules` — mise a jour

La RPC existante est modifiee pour :
1. Lire `module_registry` : noeuds deployes
2. Filtrer par `required_plan` selon le plan de l'agence (via `agency_subscription.tier_key`)
3. Appliquer heritage parent (recursive CTE : parent non deploye = enfant exclu)
4. Merger avec `user_modules` (inchange)
5. Retourner le meme format (`module_key text, enabled boolean, options jsonb`) pour compatibilite

## Etape 2 — Fichiers de configuration

### `src/config/moduleTree.ts` (nouveau)

Arbre canonique en TypeScript — sert uniquement de :
- Reference structurelle pour le seed
- Garde-fou en dev (comparaison avec la base)
- N'est jamais lu au runtime pour les permissions

```typescript
interface ModuleTreeNode {
  key: string;
  label: string;
  nodeType: 'section' | 'screen' | 'feature';
  requiredPlan: 'STARTER' | 'PRO';
  deployed: boolean;
  children?: ModuleTreeNode[];
}
```

### `src/config/legacyModuleMapping.ts` (nouveau)

Mapping centralise, marque `@deprecated`, entre nouvelles cles arborescentes et anciennes cles plates :

```text
Cas A (feuille → ancienne option) :
  outils.parc.vehicules → parc.vehicules
  documents.gerer → divers_documents.gerer

Cas B (ecran → ancien module) :
  guides.apogee → guides (enabled) + help_academy.apogee

Cas C (agregation multi-noeuds → cle legacy) :
  stats.* → stats (enabled si au moins un noeud enfant actif)
```

Regle : aucun nouveau code ne consomme les anciennes cles.

## Etape 3 — Hook `useModuleRegistry.ts` (nouveau)

- `useModuleRegistry()` : charge `module_registry` complet, reconstruit l'arbre cote client
- Calcul des **valeurs effectives** par recursion (jamais stockees en base) :
  - Parent `is_deployed=false` → descendants effectivement non deployes
  - Parent `required_plan='PRO'` → descendants effectivement PRO minimum
  - Un enfant peut etre plus restrictif, jamais plus permissif que son parent
- `useUpdateModuleNode()` : mutation UPDATE `is_deployed` / `required_plan`
- `usePropagateToChildren()` : mutation batch pour propager un changement (ecriture physique sur les enfants, a la demande explicite de l'admin)

## Etape 4 — `ModulesMasterView.tsx` (remplace PlansManagerView)

### Colonnes

| Colonne | Description |
|---------|-----------|
| Nom | Label avec indentation par niveau |
| Type | Badge discret section/screen/feature |
| Deploye | Switch on/off (valeur propre) |
| Plan min. | Badge cliquable Basique ↔ Pro (valeur propre) |
| Effectif | Badge read-only du plan effectif apres heritage |
| Etat | "herite" / "surcharge" si valeur propre ≠ effective |

### Comportements

- Toggle sur un parent → dialog "Propager aux N enfants ?" → ecriture batch si oui
- Noeud dont le parent est OFF → visuellement grise + mention "neutralise par parent"
- Noeud dont le plan effectif differe de la valeur propre → badge "herite contraint"
- Pas de creation/suppression de noeuds depuis l'UI

### Integration

- Remplace `PlansManagerView` dans `AdminHubContent.tsx` (onglet "Plans" renomme "Modules")
- `PlansManagerView.tsx` supprime
- `usePlanTiers.ts` conserve temporairement (d'autres vues peuvent le lire) mais n'est plus la source de verite

## Etape 5 — Adapter `useEffectiveModules.ts`

- Le resolver (`effectiveModulesResolver.ts`) continue a appeler la RPC `get_user_effective_modules` (qui lit desormais `module_registry`)
- Ajout d'une couche de projection legacy via `legacyModuleMapping.ts` : les nouvelles cles arborescentes sont projetees vers les anciennes cles attendues par le reste du code
- Le `MODULE_COMPAT_MAP` existant reste en place temporairement — il sera supprime quand tout le code consommera les nouvelles cles

## Regles d'heritage (verrouillees)

1. Parent `is_deployed = false` → tous les descendants sont effectivement non deployes, meme si leur valeur propre est `true`
2. Parent `required_plan = 'PRO'` → tous les descendants ont un acces effectif PRO minimum, meme si leur valeur propre est STARTER
3. Un enfant peut stocker une valeur propre differente, mais sa valeur effective ne peut jamais etre plus permissive que l'heritage parent
4. L'interface affiche distinctement : valeur propre, valeur effective, indicateur de surcharge
5. Si un parent a une contrainte plus restrictive, cette contrainte prevaut toujours en valeur effective
6. Les noeuds ne sont pas supprimes depuis l'interface — la gouvernance passe uniquement par `is_deployed` et `required_plan`

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | `module_registry` + seed + RLS + RPC update |
| `src/config/moduleTree.ts` | Nouveau |
| `src/config/legacyModuleMapping.ts` | Nouveau |
| `src/hooks/access-rights/useModuleRegistry.ts` | Nouveau |
| `src/components/admin/views/ModulesMasterView.tsx` | Nouveau (remplace PlansManagerView) |
| `src/components/admin/views/index.ts` | Export ModulesMasterView |
| `src/components/unified/tabs/AdminHubContent.tsx` | Pointer vers ModulesMasterView |
| `src/components/admin/views/PlansManagerView.tsx` | Supprime |
| `src/lib/effectiveModulesResolver.ts` | Inchange (la RPC change, pas le resolver) |
| `src/hooks/access-rights/useEffectiveModules.ts` | Ajout projection legacy |

## Ce que cet ecran ne fait PAS

- Pas de gestion des roles (Couche 2)
- Pas d'overrides utilisateur (Couche 3)
- Pas de creation/suppression de noeuds

## Ordre d'execution

1. Migration SQL (table + seed + RLS + RPC)
2. `moduleTree.ts` + `legacyModuleMapping.ts`
3. `useModuleRegistry.ts`
4. `ModulesMasterView.tsx`
5. Branchement dans AdminHubContent + suppression PlansManagerView
6. Adaptation `useEffectiveModules` avec projection legacy

