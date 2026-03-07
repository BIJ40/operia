

# Ajouter la colonne "Rôle min." au registre des modules

## Objectif

Remplacer le `minRole` hardcodé dans `MODULE_DEFINITIONS` par une colonne `min_role` dans la table `module_registry`, éditable depuis le ModulesMasterView avec les mêmes badges dropdown que ceux utilisés dans la gestion utilisateurs (screenshot PJ). Chaque noeud de l'arbre peut avoir son propre rôle minimum, indépendamment de son parent (comme pour les plans).

## Changements

### 1. Migration SQL — Ajouter `min_role` à `module_registry`

Ajouter une colonne `min_role INTEGER NOT NULL DEFAULT 0` (niveau numérique N0-N6).
Peupler les valeurs initiales à partir des `minRole` actuels du code :
- `stats`, `salaries`, `outils`, `documents` → 2 (franchisee_admin)
- `guides`, `ticketing`, `aide` → 0 (base_user)
- Chaque enfant hérite de la valeur de son parent par défaut mais reste indépendant.

### 2. Hook `useModuleRegistry` — Étendre le type et le chargement

- Ajouter `min_role: number` dans `RegistryRow` et `RegistryNode`
- Pas d'héritage parent→enfant pour `min_role` (chaque noeud porte sa propre valeur, comme `required_plan`)
- Supporter la mutation `{ min_role: number }` dans `useUpdateModuleNode` et `usePropagateToChildren`

### 3. `ModulesMasterView` — 6e colonne "Rôle min."

- Grid passe de 5 à 6 colonnes
- Nouvelle colonne après "Effectif" avec un badge dropdown cliquable
- Badge affiche le label court du rôle avec les couleurs du screenshot PJ :
  - N0: "Partenaire externe" (gris)
  - N1: "Utilisateur agence" (bleu/teal)
  - N2: "Dirigeant agence" (vert/indigo)
  - N3: "Animateur réseau" (bleu)
  - N4: "Direction réseau" (indigo)
  - N5: "Support avancé" (violet)
  - N6: "Administrateur" (rouge)
- Clic sur le badge → dropdown avec les 7 rôles pour sélection
- Propagation aux enfants via le même dialog existant

### 4. `useEffectiveModules` — Remplacer le filtre hardcodé

- Charger `min_role` depuis `module_registry` (via une query dédiée ou en l'ajoutant au résultat de la RPC)
- Remplacer `filterByRole()` qui lit `MODULE_DEFINITIONS.minRole` par une version qui lit `min_role` depuis le registre DB
- Supprimer la dépendance à `MODULE_DEFINITIONS` pour le filtrage par rôle

### 5. RPC `get_user_effective_modules` — Filtrage serveur

- Modifier la RPC pour accepter un 2e paramètre optionnel : le `global_role` de l'utilisateur (ou le lire directement depuis `profiles`)
- Dans le CTE `registry_modules`, ajouter un filtre : `WHERE ... AND mr.min_role <= v_user_role_level`
- Cela sécurise l'accès côté serveur (pas seulement côté client)

### 6. Nettoyage legacy

- Supprimer `minRole` de l'interface `ModuleDefinition` dans `src/types/modules.ts` et de toutes les entrées `MODULE_DEFINITIONS`
- Supprimer `filterByRole()` et `canAccessModule()` qui lisent `MODULE_DEFINITIONS.minRole`
- Supprimer les imports/usages de `MODULE_DEFINITIONS` dans `useEffectiveModules` liés au filtrage rôle
- Mettre à jour `src/permissions/permissionsEngine.ts` et `supabase/functions/_shared/permissionsEngine.ts` pour ne plus référencer les `minRole` hardcodés
- Mettre à jour `src/types/accessControl.ts` `canAccessModule` → utiliser la DB

### 7. Edge function sync

- Mettre à jour `supabase/functions/_shared/permissionsEngine.ts` : le filtre rôle sera géré par la RPC, donc le code edge n'a plus besoin de `MODULE_MIN_ROLES`

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `min_role` + seed |
| `src/hooks/access-rights/useModuleRegistry.ts` | Étendre types + mutations |
| `src/components/admin/views/ModulesMasterView.tsx` | Ajouter 6e colonne + dropdown rôle |
| `src/hooks/access-rights/useEffectiveModules.ts` | Remplacer `filterByRole` par DB |
| RPC `get_user_effective_modules` | Ajouter filtre `min_role` serveur |
| `src/types/modules.ts` | Supprimer `minRole` de MODULE_DEFINITIONS |
| `src/types/accessControl.ts` | Adapter `canAccessModule` |
| `src/permissions/permissionsEngine.ts` | Supprimer `MODULE_MIN_ROLES` |
| `supabase/functions/_shared/permissionsEngine.ts` | Supprimer `MODULE_MIN_ROLES` |
| `src/permissions/constants.ts` | Supprimer `MODULE_MIN_ROLES` |

## Résultat

Un seul écran admin centralise les 3 axes d'accès module :
1. **Déployé** (switch on/off)
2. **Plan min.** (STARTER / PRO / Individuel)
3. **Rôle min.** (N0 → N6, badges colorés comme la PJ)

Le tout propageable aux enfants, stocké en DB, filtré côté serveur.

