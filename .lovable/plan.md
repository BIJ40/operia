

## Analyse des problèmes identifiés

### 1. Données réelles dans `plan_tier_modules` pour STARTER

| Module | STARTER enabled | PRO enabled | Statut |
|--------|:---:|:---:|--------|
| `organisation.salaries` | **false** | true | **BUG** — devrait être true |
| `organisation.plannings` | true | true | OK |
| `organisation.reunions` | **false** | true | **BUG** — devrait être true |
| `organisation.documents_legaux` | true | true | OK |
| `organisation.zones` | true | true | OK |
| `organisation.apporteurs` | false | true | Correct (Relations pack) |

**Donc** : un N2 en STARTER n'a pas accès à **Salariés** ni **Réunions** parce que `plan_tier_modules` les a à `enabled = false`. Ce n'est pas un choix produit voulu — c'est une erreur de configuration dans la migration initiale.

### 2. `organisation.reunions` — j'avais tort

`is_deployed = true` pour Réunions. Ce n'est pas un module en développement. Il est juste mal configuré dans le tier STARTER (`enabled = false`).

### 3. `organisation.apporteurs` — double système

Actuellement, Apporteurs est :
- Un module standard dans `module_registry` (PRO only)
- ET une feature du pack Relations dans `agency_features`

Ces deux systèmes ne communiquent pas. Activer le pack Relations dans `agency_features` n'active pas `organisation.apporteurs` dans le moteur de modules. Donc un STARTER avec Relations activé n'aura toujours pas accès à l'onglet Apporteurs côté navigation.

### 4. Page Droits admin — Apporteurs mal catégorisé

Dans `rightsTaxonomy.ts`, `organisation.apporteurs` est listé comme un module Organisation classique. Le user demande qu'il soit déplacé dans une section "Options" (ou "Relations") distincte, pour refléter qu'il est désormais une option payante du pack et non un module standard désactivable.

---

## Plan de correction

### Étape 1 — Migration SQL : corriger plan_tier_modules STARTER

```sql
UPDATE plan_tier_modules SET enabled = true 
WHERE tier_key = 'STARTER' AND module_key = 'organisation.salaries';

UPDATE plan_tier_modules SET enabled = true 
WHERE tier_key = 'STARTER' AND module_key = 'organisation.reunions';
```

Résultat : un N2 STARTER aura accès à Salariés et Réunions immédiatement.

### Étape 2 — Taxonomie droits : déplacer Apporteurs dans une section "Options"

Dans `rightsTaxonomy.ts` :
- Retirer `organisation.apporteurs` de la catégorie `organisation`
- Créer une nouvelle catégorie `options` (ou `relations`) contenant `organisation.apporteurs`
- Label affiché : "Options / Pack Relations"

### Étape 3 — Pont agency_features → modules (question ouverte)

Quand le pack Relations est activé pour une agence via `agency_features`, faut-il automatiquement injecter `organisation.apporteurs` dans `user_modules` pour les utilisateurs de cette agence ? Sinon l'activation du pack Relations n'ouvre pas réellement l'onglet Apporteurs dans la navigation.

**Deux options :**
- **A)** Créer un trigger/hook qui, à l'activation du pack, insère un override `user_modules` pour les users de l'agence
- **B)** Modifier la RPC `get_user_effective_modules` pour consulter aussi `agency_features` (interdit par contrainte)

Option A est la seule viable vu les contraintes.

---

## Résumé des actions

| # | Action | Impact |
|---|--------|--------|
| 1 | Fix `plan_tier_modules` STARTER : Salariés + Réunions = true | N2 STARTER retrouve accès |
| 2 | Nouvelle catégorie "Options" dans `rightsTaxonomy.ts` | Admin voit Apporteurs séparé |
| 3 | Pont activation pack → user_modules (si validé) | Pack Relations ouvre réellement l'onglet |

