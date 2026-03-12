

## Diagnostic

Le problème n'est pas `mon_agence` mais un **désalignement entre `module_registry` et `plan_tier_modules`**.

### Ce qui se passe

1. Le `module_registry` contient 4 clés récentes :
   - `pilotage.performance`
   - `pilotage.actions_a_mener`
   - `pilotage.devis_acceptes`
   - `pilotage.incoherences`

2. **Aucune de ces 4 clés n'a d'entrée dans `plan_tier_modules`** (ni STARTER, ni PRO)

3. Le RPC `get_user_effective_modules` applique le principe fail-closed : `COALESCE(ptm.enabled, false) = true` → sans entrée PTM, le module est refusé

4. `PilotageTabContent.tsx` (ligne 46-49) vérifie `hasModule('pilotage.performance')` etc. → `false` → onglets désactivés (grisés)

5. Paradoxalement, les **routes** (`pilotage.routes.tsx`) utilisent encore l'ancien système : `ModuleGuard moduleKey="pilotage.agence" requiredOption="actions_a_mener"` → qui fonctionne car le RPC retourne bien `pilotage.agence` avec `{actions_a_mener: true}` pour PRO

### Résumé visuel

```text
module_registry          plan_tier_modules       Frontend check
──────────────           ─────────────────       ──────────────
pilotage.performance     ❌ ABSENT               hasModule() → false → onglet grisé
pilotage.actions_a_mener ❌ ABSENT               hasModule() → false → onglet grisé
pilotage.devis_acceptes  ❌ ABSENT               hasModule() → false → onglet grisé
pilotage.incoherences    ❌ ABSENT               hasModule() → false → onglet grisé

pilotage.agence          ✅ PRO: enabled+options  ModuleGuard → OK (route fonctionne)
```

## Correction

### Migration SQL — Ajouter les 4 clés dans `plan_tier_modules`

Pour STARTER et PRO, insérer les entrées manquantes. Ces 4 fonctionnalités sont des sous-onglets de Pilotage qui devraient suivre la même logique que `pilotage.agence` :

| Clé | STARTER | PRO |
|---|---|---|
| `pilotage.performance` | `true` | `true` |
| `pilotage.actions_a_mener` | `false` | `true` |
| `pilotage.devis_acceptes` | `false` | `true` |
| `pilotage.incoherences` | `false` | `true` |

Performance (tableau de bord global) est accessible STARTER. Les 3 autres (actions, devis, incohérences) sont PRO uniquement car ils dépendent des options `pilotage.agence` qui ne sont activées que pour PRO.

### Aucun changement frontend

Le code frontend (`PilotageTabContent.tsx`) est correct — il vérifie les bonnes clés. Le problème est purement données manquantes côté base.

### Fichiers concernés
- 1 migration SQL (8 INSERT dans `plan_tier_modules`)

