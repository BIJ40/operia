# Moteur de Permissions V1 — État Actuel

> **Date** : 29 mars 2026
> **Statut** : EN PRODUCTION — sera remplacé par V2
> **RPC** : `get_user_effective_modules` (post-Patch V1)

---

## 1. Vue d'ensemble

Le système de permissions V1 détermine quels modules sont accessibles à chaque utilisateur. Il repose sur une cascade de résolution combinant plan d'agence, overrides individuels, rôle minimum et bypass N5+.

### Politique : Fail-closed

Un module absent = refusé. Aucun fallback permissif. Aucun `COALESCE(..., true)`.

---

## 2. Tables V1

| Table | Rôle | Volume |
|-------|------|:--:|
| `module_registry` | Registre des 74 modules déployés | 74 lignes |
| `plan_tiers` | Plans (STARTER, PRO) | 2 lignes |
| `plan_tier_modules` | Modules inclus par plan | ~54 lignes |
| `agency_subscription` | Plan actif par agence | ~41 lignes |
| `agency_features` | Options payantes (pack Relations) | ~6 lignes |
| `user_modules` | Overrides individuels | ~17 lignes |

---

## 3. RPC `get_user_effective_modules`

### Cascade de résolution

```
1. Lire profil → global_role, role_level, agency_id, tier_key
2. Si role_level >= 5 → BYPASS : retourner tous les modules déployés

3. PATH 1 — Modules via plan (required_plan != 'NONE')
   → plan_tier_modules WHERE tier_key = v_tier_key AND enabled = true
   → Filtre : role_level >= min_role du module

4. PATH 2 — Modules hors plan (required_plan = 'NONE') [ajouté Patch V1]
   → module_registry WHERE required_plan = 'NONE'
   → Filtre : role_level >= min_role

5. Overrides utilisateur
   → user_modules JOIN module_registry (validation clé) [ajouté Patch V1]
   → Expansion enfants récursive
   → Contrainte plan sur overrides [ajouté Patch V1]

6. Auto-grant sections parentes
   → Si un enfant est accordé, le parent l'est aussi

7. Merge des 4 sources → résultat final
```

### CTEs (post-Patch V1)

```
1. deployed_tree          — arbre récursif module_registry
2. registry_modules       — PATH 1 : modules via plan
3. role_based_modules     — PATH 2 : modules hors plan (NONE)
4. user_override_expanded — overrides + expansion + validation clé
5. user_overrides         — déduplication DISTINCT ON
6. user_overrides_checked — contrainte plan sur overrides
7. ancestor_grants        — auto-grant sections parentes
8. merged                 — union des 4 sources
```

---

## 4. Règle N1 (salariés)

**Les N1 ne reçoivent AUCUN module via le plan d'agence.**

La RPC filtre `role_level >= 2` pour l'héritage plan. Les N1 accèdent aux modules uniquement via :
- Des overrides dans `user_modules` (délégation N2)
- Les presets poste (hardcodés en TS, appliqués à la création)

---

## 5. Hooks et Context frontend

| Fichier | Rôle |
|---------|------|
| `src/hooks/useEffectiveModules.ts` | Appel RPC + React Query |
| `src/hooks/useModuleRegistry.ts` | Lecture module_registry |
| `src/contexts/AuthContext.tsx` | PermissionsContext intégré |
| `src/permissions/permissionsEngine.ts` | Moteur de résolution client (613 lignes) |
| `src/permissions/constants.ts` | Constantes (MODULE_MIN_ROLES, MODULE_LABELS) |
| `src/permissions/moduleRegistry.ts` | Registre client (validation, lookup) |

### API frontend

```typescript
// Depuis PermissionsContext
const { hasModule, hasModuleOption } = usePermissions();

if (hasModule('pilotage.agence')) { ... }
if (hasModuleOption('ticketing.kanban')) { ... }
```

---

## 6. Interfaces admin V1

### ModulesMasterView (N4+)
- Toggles par module pour chaque utilisateur
- Choix des options granulaires
- Vue par agence ou globale

### AgencyTeamRightsPanel (N2)
- Tuiles colorées par domaine (Pilotage, Commercial, Organisation, Support)
- Chips par module dans chaque tuile
- Master toggle par catégorie

### TeamMemberModules (N2 → N1)
- Toggles hiérarchiques module + sous-modules
- Bouton "Réinitialiser au profil" (reapplique preset poste)
- Le N2 ne peut déléguer que ce qu'il possède

---

## 7. Limites connues V1

| Limite | Impact |
|--------|--------|
| `MODULE_DEFINITIONS` hardcodé (928 lignes TS) | Redéploiement pour tout changement |
| `modulesByRole.ts` ≠ `defaultModules.ts` (edge) | Divergence frontend/edge defaults |
| Pas de deny explicite | Impossible de retirer un module inclus dans le plan |
| Pas d'audit trail | Aucune traçabilité des changements de droits |
| `agency_features` déconnecté | Pack Relations ≠ module `organisation.apporteurs` |
| Presets poste hardcodés en TS | Non configurable par admin |

---

## 8. Patch V1 — Correctifs appliqués (28 mars 2026)

| Bug | Correction |
|-----|-----------|
| Modules `required_plan = 'NONE'` invisibles | Nouveau CTE `role_based_modules` |
| N0/N1 bloqués par `role_level >= 2` | Filtre supprimé, contrôle via min_role |
| Ghost keys non validées | JOIN module_registry sur user_modules |
| Billing bypass sur overrides | Contrainte plan sur user_overrides |
| `commercial.suivi_client` manquant STARTER | INSERT dans plan_tier_modules |

### Remap legacy keys

| Ancienne | → Nouvelle |
|----------|-----------|
| `aide` | `support.aide_en_ligne` |
| `guides` | `support.guides` |
| `rh` | `organisation.salaries` |
| `agence` | `pilotage.statistiques` |
| `parc` | Supprimé (doublon) |
