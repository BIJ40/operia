# Phase 5 — Préparation additive à la purge legacy

**Date** : 2026-03-11  
**Statut** : ✅ Exécuté  
**Nature** : Phase strictement additive — aucune suppression legacy

---

## 1. Résumé exécutif

La Phase 5 prépare la suppression future du `COMPAT_MAP` (Phase 6) en :
- Corrigeant les 2 derniers guards front legacy (`agence`)
- Ajoutant les clés hiérarchiques manquantes dans `module_registry`
- Dupliquant les permissions legacy dans `plan_tier_modules` vers les nouvelles clés

**Aucune suppression n'a été effectuée.** Le `COMPAT_MAP` reste actif. La RPC `get_user_effective_modules` est inchangée.

### État après Phase 5

| Composant | État |
|---|---|
| Front guards legacy | ✅ 0 restant (corrigés) |
| `COMPAT_MAP` | ✅ Actif (inchangé) |
| `module_registry` | ✅ 3 clés hiérarchiques ajoutées |
| `plan_tier_modules` | ✅ 20 lignes ajoutées (10 clés × 2 tiers) |
| `user_modules` | ✅ Aucune clé legacy ciblée présente |
| RPC `get_user_effective_modules` | ⚠️ Inchangée (prérequis Phase 6) |

---

## 2. Inventaire des legacy keys encore présentes

### `plan_tier_modules` — 12 clés legacy (conservées)

| Legacy key | STARTER | PRO | Nouvelle clé ajoutée |
|---|---|---|---|
| `agence` | enabled=true | enabled=true | `pilotage.agence` |
| `stats` | enabled=false | enabled=true | `pilotage.dashboard` |
| `rh` | enabled=false | enabled=true | `organisation.salaries` |
| `parc` | enabled=false | enabled=true | `organisation.parc` |
| `divers_apporteurs` | enabled=false | enabled=true | `organisation.apporteurs` |
| `divers_plannings` | enabled=true | enabled=true | `organisation.plannings` |
| `divers_reunions` | enabled=true | enabled=true | `organisation.reunions` |
| `divers_documents` | enabled=false | enabled=true | `mediatheque.documents` |
| `aide` | enabled=true | enabled=true | `support.aide_en_ligne` |
| `guides` | enabled=true | enabled=true | `support.guides` |
| `prospection` | — | — | Hors périmètre Phase 5 |
| `ticketing` | — | — | Hors périmètre Phase 5 |

### `user_modules` — 0 clés legacy ciblées

Les seules clés présentes sont `reseau_franchiseur`, `ticketing`, `unified_search` — aucune dans le périmètre de migration.

### `realisations`

**Mapping théorique non appliqué.** La clé `realisations` n'existe pas dans `plan_tier_modules`. Le mapping `realisations → commercial.realisations` est documenté mais aucune donnée n'a été migrée.

---

## 3. État du front runtime

### Avant Phase 5 — 2 reliquats

| Fichier | Ligne | Code legacy |
|---|---|---|
| `src/apogee-connect/pages/IndicateursLayout.tsx` | L28 | `hasModule('agence')` |
| `src/config/dashboardTiles.ts` | L176 | `requiresModule: 'agence'` |

### Après Phase 5 — 0 reliquat

Les deux occurrences ont été migrées vers `pilotage.agence`.

**Méthode de vérification** : Scan regex sur `hasModule\(`, `requiresModule:`, `ModuleGuard`, `moduleKey`, `altModules`, `moduleGuard` — aucun résultat legacy hors `COMPAT_MAP`, commentaires, docs, tests, et clés protégées (`ticketing`, `prospection`).

---

## 4. Plan de migration des données (exécuté)

### Bloc B — `module_registry` (3 INSERT)

```sql
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('pilotage.agence',       'Agence',    'pilotage',    'section', 50, true, 'STARTER', 2),
  ('pilotage.dashboard',    'Dashboard', 'pilotage',    'section', 10, true, 'STARTER', 2),
  ('mediatheque.documents', 'Documents', 'mediatheque', 'section', 10, true, 'STARTER', 0)
ON CONFLICT (key) DO NOTHING;
```

### Bloc C — `plan_tier_modules` (20 INSERT via SELECT)

```sql
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
SELECT tier_key,
       CASE module_key
         WHEN 'agence' THEN 'pilotage.agence'
         WHEN 'stats' THEN 'pilotage.dashboard'
         WHEN 'rh' THEN 'organisation.salaries'
         WHEN 'parc' THEN 'organisation.parc'
         WHEN 'divers_apporteurs' THEN 'organisation.apporteurs'
         WHEN 'divers_plannings' THEN 'organisation.plannings'
         WHEN 'divers_reunions' THEN 'organisation.reunions'
         WHEN 'divers_documents' THEN 'mediatheque.documents'
         WHEN 'aide' THEN 'support.aide_en_ligne'
         WHEN 'guides' THEN 'support.guides'
       END,
       enabled,
       options_override
FROM plan_tier_modules
WHERE module_key IN ('agence','stats','rh','parc','divers_apporteurs','divers_plannings',
                     'divers_reunions','divers_documents','aide','guides')
ON CONFLICT (tier_key, module_key) DO NOTHING;
```

**Résultat vérifié** : 20 nouvelles lignes créées (10 clés × 2 tiers STARTER/PRO), valeurs `enabled` et `options_override` identiques aux legacy.

---

## 5. Fichiers créés / modifiés

| Fichier | Type | Rôle |
|---|---|---|
| `src/apogee-connect/pages/IndicateursLayout.tsx` | Modifié | Guard `agence` → `pilotage.agence` + import `ModuleKey` |
| `src/config/dashboardTiles.ts` | Modifié | `requiresModule: 'agence'` → `'pilotage.agence'` |
| `supabase/migrations/…_phase5_additive.sql` | Créé | INSERT module_registry + plan_tier_modules |
| `dev-reports/phase5-legacy-data-migration-report.md` | Créé | Ce rapport |

---

## 6. Sécurité / rollback

### Rollback front

Remettre `'agence'` dans les 2 fichiers modifiés. Le `COMPAT_MAP` résout toujours `pilotage.agence` via la legacy key `agence` — aucun risque d'accès cassé.

### Rollback SQL

```sql
-- Supprimer les nouvelles clés ajoutées dans plan_tier_modules
DELETE FROM plan_tier_modules
WHERE module_key IN (
  'pilotage.agence', 'pilotage.dashboard', 'organisation.salaries',
  'organisation.parc', 'organisation.apporteurs', 'organisation.plannings',
  'organisation.reunions', 'mediatheque.documents', 'support.aide_en_ligne',
  'support.guides'
);

-- Supprimer les clés ajoutées dans module_registry
DELETE FROM module_registry
WHERE key IN ('pilotage.agence', 'pilotage.dashboard', 'mediatheque.documents');
```

### Sécurité

- Toutes les insertions utilisent `ON CONFLICT DO NOTHING` (idempotent)
- Les lignes legacy sont intactes
- Le `COMPAT_MAP` assure la résolution bidirectionnelle pendant la transition

---

## 7. Risques résiduels

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| RPC retourne les deux clés (legacy + nouvelle) pour un même module | Faible | Nul | Le client déduplique via `hasModule`, pas de double effet |
| `realisations` absent de `plan_tier_modules` | — | Aucun | Documenté comme mapping théorique |
| `prospection` / `ticketing` non migrés | — | Aucun | Hors périmètre Phase 5, protégés |

---

## 8. Recommandation pour la Phase 6

### Prérequis avant suppression du `COMPAT_MAP`

1. **Évolution de la RPC `get_user_effective_modules`** : La RPC doit retourner les nouvelles clés hiérarchiques nativement (via `module_registry` + `plan_tier_modules` alignés). Actuellement elle retourne les legacy keys car elles existent encore dans `plan_tier_modules`.

2. **Suppression des lignes legacy de `plan_tier_modules`** : Une fois la RPC mise à jour, les 20 lignes legacy (10 clés × 2 tiers) peuvent être supprimées.

3. **Suppression du `COMPAT_MAP`** dans `src/permissions/compatMap.ts` et des références dans `useEffectiveModules.ts`.

4. **Vérification `user_modules`** : Aucune action requise (0 clé ciblée présente).

### Verdict

✅ **La Phase 6 est cadrée et prévisible.** Le prérequis principal est l'évolution de la RPC pour résoudre nativement les nouvelles clés.
