

## Diagnostic : Bugs de la fiche utilisateur (NavigationAccessView)

### Problèmes identifiés (3 bugs d'affichage, pas de bug de droits réels)

**Les droits effectifs (RPC) sont probablement corrects.** Le problème est dans `NavigationAccessView` qui affiche mal la structure de navigation.

---

### Bug 1 — Labels dupliqués (critique)

`resolveEntryLabel()` utilise `entry.guard.moduleKey` pour résoudre le label DB. Quand plusieurs entrées partagent le même `moduleKey`, elles obtiennent toutes le même label :

```text
Pilotage:
  Performance    → getLabel('pilotage.agence') → "Mon agence"
  Actions à mener→ getLabel('pilotage.agence') → "Mon agence"  ← doublon
  Devis acceptés → getLabel('pilotage.agence') → "Mon agence"  ← doublon
  Incohérences   → getLabel('pilotage.agence') → "Mon agence"  ← doublon

Commercial:
  Suivi client   → getLabel('prospection') → "Commercial / Prospection"
  Comparateur    → getLabel('prospection') → "Commercial / Prospection"  ← doublon
  ...

Documents:
  Raccourcis     → getLabel('mediatheque.gerer') → "Gérer"
  Corbeille      → getLabel('mediatheque.gerer') → "Gérer"  ← doublon
```

**Correction** : Dans `resolveEntryLabel`, le label DB ne doit être utilisé que si l'entrée a un `moduleKey` **unique** dans son domaine. Sinon, garder le label statique (`entry.label`). Plus simplement : ne jamais overrider le label statique par le label DB quand `optionKey` est défini ou quand le moduleKey est partagé.

---

### Bug 2 — Franchiseur affiché 8/8 alors que c'est en développement

La section Franchiseur dans `NAVIGATION_STRUCTURE` a `roleGated: FRANCHISEUR_ROLES` et chaque entrée a `minRoles: FRANCHISEUR_ROLES`. Eric est `franchisor_user` (N3), donc `evaluateGuard` retourne `true` pour toutes les entrées.

Le problème : ces entrées ne vérifient pas `isDeployedModule`. Si le domaine Franchiseur est marqué "en cours de développement", les guards devraient en tenir compte.

**Correction** : Ajouter un champ optionnel `deploymentKey` dans `NavigationGuard` et vérifier `isDeployedModule` dans `evaluateGuard`. Alternativement, filtrer les entrées non-déployées dans `NavigationAccessView`.

---

### Bug 3 — Modules plan affichés comme accessibles pour un franchiseur sans agence

Eric (N3, `agency_id = NULL`) voit Statistiques ✅, Plannings ✅, etc. La RPC `get_user_effective_modules` retourne ces modules parce qu'elle applique un plan par défaut aux N2+, même sans agence.

C'est un **vrai problème de données** dans la RPC — pas juste d'affichage. Un franchiseur sans agence ne devrait pas hériter des modules de plan d'agence.

**Correction RPC** : Conditionner l'héritage plan-tier au fait que l'utilisateur ait un `agency_id` non NULL. Les franchiseurs (N3-N4) sans agence ne devraient recevoir que les modules explicitement dans `user_modules`.

---

### Plan d'implémentation

**Fichier 1 — `src/components/admin/users/user-profile-sheet/NavigationAccessView.tsx`**
- Modifier `resolveEntryLabel` : utiliser le label statique (`entry.label`) quand l'entrée a un `optionKey` ou quand le `moduleKey` est partagé par plusieurs entrées du même domaine. Ne résoudre via DB que pour les entrées avec un moduleKey unique.

**Fichier 2 — `src/lib/navigationStructure.ts`**
- Ajouter `deploymentKey?: string` dans `NavigationGuard` pour les entrées du domaine Franchiseur.
- Modifier `evaluateGuard` pour intégrer un check de déploiement optionnel (passé en paramètre).

**Fichier 3 — Correction RPC (migration SQL)**
- Modifier la RPC `get_user_effective_modules` : ajouter une condition `AND v_agency_id IS NOT NULL` à l'héritage des `plan_tier_modules`. Cela garantit que les franchiseurs sans agence ne reçoivent que leurs modules explicites.

### Fichiers modifiés
1. `src/components/admin/users/user-profile-sheet/NavigationAccessView.tsx` — fix labels dupliqués
2. `src/lib/navigationStructure.ts` — support deploymentKey dans guards
3. Migration SQL — fix RPC pour franchiseurs sans agence

