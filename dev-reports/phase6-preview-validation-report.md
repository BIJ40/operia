# Phase 6 — Preview Validation Report

**Date**: 2026-03-12  
**Statut**: VALIDÉ  
**Périmètre**: Validation preview RPC + guards front — aucune modification de code

---

## 1. Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| Clés testées | 11 |
| Clés validées (OK) | 10 |
| Clés clarifiées | 1 (`commercial.realisations`) |
| Clés KO | 0 |
| Profils testés | 4 (base_user, franchisee_user, franchisee_admin, superadmin) |
| Tiers couverts | STARTER, PRO |
| Niveaux de rôle couverts | 0, 1, 2, 6 |

**Conclusions** :

- La RPC `get_user_effective_modules` est confirmée stable après Phase 6.
- Les guards front consomment correctement les clés hiérarchiques.
- `COMPAT_MAP` sert uniquement de filet de sécurité — aucun guard ne dépend exclusivement du fallback.
- Le système est prêt pour la migration des constantes et la préparation du retrait de `COMPAT_MAP`.

---

## 2. Matrice de test

### Profils utilisés

| Profil | Tier | Role level | Description |
|--------|------|------------|-------------|
| `base_user` | STARTER | 0 | Utilisateur de base, pas franchisé |
| `franchisee_user` | PRO | 1 | Collaborateur agence PRO |
| `franchisee_admin` | PRO | 2 | Administrateur agence PRO |
| `superadmin` | PRO | 6 | Platform admin (bypass N5+) |

### Résultats RPC observés

| Clé | STARTER N0 | PRO N1 | PRO N2 | Superadmin N6 |
|-----|-----------|--------|--------|---------------|
| `pilotage.agence` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options: `actions_a_mener`, `diffusion`, `indicateurs` | ✅ enabled |
| `pilotage.dashboard` | ❌ exclu (required_plan=PRO) | ❌ exclu (min_role=2) | ✅ enabled, options: `exports`, `stats_hub` | ✅ enabled |
| `organisation.salaries` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options: `rh_admin`, `rh_viewer` | ✅ enabled |
| `organisation.parc` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options: `epi`, `equipements`, `vehicules` | ✅ enabled |
| `organisation.apporteurs` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options: `consulter`, `gerer` | ✅ enabled |
| `organisation.plannings` | ❌ exclu (min_role=1) | ✅ enabled, options vides | ✅ enabled, options vides | ✅ enabled |
| `organisation.reunions` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options vides | ✅ enabled |
| `mediatheque.documents` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options: `corbeille_vider`, `gerer` | ✅ enabled |
| `support.aide_en_ligne` | ✅ enabled, options: `agent:false`, `user:true` | ✅ enabled, options: `agent:true`, `user:true` | ✅ enabled, options: `agent:true`, `user:true` | ✅ enabled |
| `support.guides` | ❌ exclu (min_role=1) | ✅ enabled, 4 options | ✅ enabled, 4 options | ✅ enabled |
| `commercial.realisations` | ❌ exclu | ❌ exclu (min_role=2) | ✅ enabled, options vides | ✅ enabled |

---

## 3. Validation détaillée des 11 clés

### 3.1 `pilotage.agence`

| | Détail |
|---|---|
| **Source** | `module_registry` + `plan_tier_modules` (options_override) |
| **Attendu** | PRO N2+ uniquement, avec options `actions_a_mener`, `diffusion`, `indicateurs` |
| **Observé** | Conforme — exclu pour STARTER et PRO N1, présent avec options pour PRO N2 |
| **Statut** | ✅ OK |

### 3.2 `pilotage.dashboard`

| | Détail |
|---|---|
| **Source** | `module_registry` (required_plan=PRO) + `plan_tier_modules` |
| **Attendu** | PRO N2+ uniquement (required_plan=PRO, min_role=2) |
| **Observé** | Conforme — exclu pour STARTER (plan gate), exclu pour PRO N1 (role gate) |
| **Statut** | ✅ OK |

### 3.3 `organisation.salaries`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=2) + `plan_tier_modules` |
| **Attendu** | PRO N2+ avec options `rh_admin`, `rh_viewer` |
| **Observé** | Conforme |
| **Statut** | ✅ OK |

### 3.4 `organisation.parc`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=2) + `plan_tier_modules` |
| **Attendu** | PRO N2+ avec options `epi`, `equipements`, `vehicules` |
| **Observé** | Conforme |
| **Statut** | ✅ OK |

### 3.5 `organisation.apporteurs`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=2) + `plan_tier_modules` |
| **Attendu** | PRO N2+ avec options `consulter`, `gerer` |
| **Observé** | Conforme |
| **Statut** | ✅ OK |

### 3.6 `organisation.plannings`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=1) + `plan_tier_modules` |
| **Attendu** | PRO N1+ (min_role=1), options vides |
| **Observé** | Conforme — exclu pour STARTER N0, présent pour PRO N1+ |
| **Statut** | ✅ OK |

### 3.7 `organisation.reunions`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=2) + `plan_tier_modules` |
| **Attendu** | PRO N2+ (min_role=2), options vides |
| **Observé** | Conforme |
| **Statut** | ✅ OK |
| **Note** | Voir section 6 pour incohérence données STARTER |

### 3.8 `mediatheque.documents`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=2) + `plan_tier_modules` |
| **Attendu** | PRO N2+ avec options `corbeille_vider`, `gerer` |
| **Observé** | Conforme |
| **Statut** | ✅ OK |

### 3.9 `support.aide_en_ligne`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=0, STARTER) + `plan_tier_modules` |
| **Attendu** | Tous tiers, tous rôles — options différenciées par tier |
| **Observé** | Conforme — STARTER reçoit `agent:false`, PRO reçoit `agent:true` |
| **Statut** | ✅ OK |

### 3.10 `support.guides`

| | Détail |
|---|---|
| **Source** | `module_registry` (min_role=1) + `plan_tier_modules` |
| **Attendu** | PRO N1+ avec 4 options |
| **Observé** | Conforme — exclu pour STARTER N0 |
| **Statut** | ✅ OK |

### 3.11 `commercial.realisations`

| | Détail |
|---|---|
| **Source** | `module_registry` uniquement (min_role=2, required_plan=PRO) |
| **Attendu** | PRO N2+, options vides |
| **Observé** | Conforme — voir section 4 |
| **Statut** | ✅ À CLARIFIER (comportement normal confirmé) |

---

## 4. Cas particulier : `commercial.realisations`

### Situation

- **Présent** dans `module_registry` : `key='commercial.realisations'`, `deployed=true`, `required_plan='PRO'`, `min_role=2`
- **Absent** de `plan_tier_modules` : aucune ligne pour cette clé
- **Absent** de `user_modules` : aucun override utilisateur

### Comportement RPC

La clé est résolue via le CTE `registry_modules` :
1. `deployed_tree` la marque comme `effective_deployed = true`
2. Le `LEFT JOIN plan_tier_modules` ne trouve aucune ligne → `ptm.enabled IS NULL`
3. `COALESCE(ptm.enabled, true) = true` → la clé passe le filtre
4. `COALESCE(ptm.options_override, '{}'::jsonb)` → options vides

### Impact

- Le comportement est **identique au pré-Phase 6** : la clé legacy `realisations` n'existait pas non plus dans `plan_tier_modules`
- Les options vides sont cohérentes — cette clé n'a pas d'options définies
- Le guard front `hasModule('commercial.realisations')` retourne `true` pour PRO N2+

### Conclusion

**Comportement normal.** Aucune action corrective requise. La clé fonctionne exactement comme prévu par le design du `registry_modules` CTE avec fallback `COALESCE`.

---

## 5. Validation Front-End Guards

Les guards suivants ont été vérifiés — tous consomment les clés hiérarchiques directement :

| Fichier | Clés utilisées | Statut |
|---------|---------------|--------|
| `PilotageTabContent.tsx` | `pilotage.dashboard`, `pilotage.agence` | ✅ OK |
| `OrganisationTabContent.tsx` | `organisation.salaries`, `organisation.parc`, `organisation.apporteurs`, `organisation.plannings`, `organisation.reunions` | ✅ OK |
| `DiversTabContent.tsx` | `organisation.*`, `pilotage.agence`, `mediatheque.documents` | ✅ OK |
| `rh.routes.tsx` | `organisation.salaries` avec `requiredOptions` | ✅ OK |
| `dashboardTiles.ts` | `pilotage.agence`, `support.guides` | ✅ OK |
| `IndicateursLayout.tsx` | `pilotage.agence` | ✅ OK |
| `UnifiedWorkspace.tsx` | 11 clés hiérarchiques référencées dans config tabs | ✅ OK |

**Rôle de `COMPAT_MAP`** : filet de sécurité uniquement. Tous les guards résolvent d'abord la clé directe dans les modules RPC. Le fallback `COMPAT_MAP` n'intervient que si la clé hiérarchique est absente des données retournées — ce qui n'est plus le cas depuis Phase 5/6.

---

## 6. Note de cohérence des données

### `organisation.reunions` — incohérence STARTER

| Source | Valeur |
|--------|--------|
| `module_registry` | `required_plan = 'PRO'` |
| `plan_tier_modules` (STARTER) | `enabled = true` |

**Explication** : La ligne `plan_tier_modules` STARTER pour `organisation.reunions` est un héritage de la clé legacy `divers_reunions` qui était active pour STARTER. Le `required_plan = 'PRO'` dans le registre prévaut dans le CTE `registry_modules` (filtre `v_tier_key = 'PRO' OR dt.effective_plan = 'STARTER'`), donc la clé est correctement exclue pour les utilisateurs STARTER.

**Impact runtime** : aucun. La contrainte `required_plan` du registre bloque l'accès avant que `plan_tier_modules` ne soit consulté.

**Action recommandée** : nettoyage optionnel dans une phase future de maintenance données, hors périmètre critique.

---

## 7. Conditions remplies pour le cutover final

| Condition | Statut |
|-----------|--------|
| RPC `get_user_effective_modules` stabilisée | ✅ Confirmé |
| Permissions critiques correctes (11 clés) | ✅ Confirmé |
| Guards front consomment les clés hiérarchiques | ✅ Confirmé |
| Options correctement transmises via `options_override` | ✅ Confirmé |
| Aucun accès indu détecté | ✅ Confirmé |
| `COMPAT_MAP` inchangé | ✅ Confirmé |
| Aucune suppression legacy | ✅ Confirmé |
| Rollback disponible et exécutable | ✅ Confirmé |

---

## 8. Risques résiduels

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Incohérence `organisation.reunions` STARTER dans `plan_tier_modules` | FAIBLE | `required_plan` du registre prévaut ; nettoyage optionnel futur |
| Absence de profil STARTER N2 dans la base de test | FAIBLE | Combinaison inexistante en production ; pas de scénario réel |
| `commercial.realisations` sans `plan_tier_modules` | AUCUN | Comportement identique au legacy ; `COALESCE` defaults corrects |

---

## 9. Recommandation

**La validation preview Phase 6 est complète. Le système est prêt pour l'étape suivante.**

Prochaines étapes autorisées :

1. **Migration des constantes front** — `AGENCY_REQUIRED_MODULES`, `MODULE_OPTION_MIN_ROLES`, `SHARED_MODULE_KEYS`
2. **Migration des types Edge Function** — `permissionsEngine.ts` ModuleKey
3. **Préparation suppression `COMPAT_MAP`** — phase dédiée, après validation des points 1 et 2

**Aucune action corrective n'est requise avant de passer à l'étape suivante.**
