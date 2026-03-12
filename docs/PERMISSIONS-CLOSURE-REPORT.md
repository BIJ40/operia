# RAPPORT DE CLÔTURE — CHANTIER PERMISSIONS

> **Date** : 12 mars 2026  
> **Statut** : ✅ Clos — Système verrouillé  
> **Suite de tests** : 434 tests passants, 0 échecs  
> **Document de référence technique** : `docs/PERMISSIONS-REFERENCE.md`

---

## BLOC 1 — SYNTHÈSE DIRIGEANT

### 1. Quel était le problème réel ?

Le système de droits d'accès de la plateforme fonctionnait « à l'envers » : **quand un droit n'était pas explicitement configuré, il était accordé par défaut au lieu d'être refusé.**

Concrètement, si un module n'avait pas été enregistré dans la table de configuration des plans (STARTER, PRO…), le système considérait automatiquement que l'utilisateur y avait droit. C'est l'équivalent d'une porte de sécurité qui s'ouvre quand on ne lui donne pas d'instruction.

### 2. Pourquoi c'était grave ?

- **Des utilisateurs STARTER accédaient à des fonctionnalités PRO** sans que personne ne l'ait voulu ni détecté.
- **Des clés de configuration « fantômes »** existaient dans le code sans effet réel, créant une fausse impression de contrôle pour les administrateurs.
- **Aucun filet de sécurité** n'empêchait le retour du problème après une mise à jour.

Le risque était à la fois **commercial** (perte de valeur du plan PRO), **opérationnel** (incohérences d'affichage) et **de confiance** (un administrateur qui configure des droits attend que ces droits soient respectés).

### 3. Qu'est-ce qui a été corrigé ?

Le moteur de droits a été entièrement inversé : **tout accès est désormais refusé par défaut, sauf autorisation explicite.** Les clés fantômes ont été supprimées. Les plans STARTER et PRO sont désormais strictement isolés. Une batterie de tests automatiques empêche toute régression.

### 4. Peut-on considérer le système comme fiable aujourd'hui ?

**Oui.** Le système repose maintenant sur une architecture « fail-closed » (fermé par défaut), validée par 434 tests automatisés qui couvrent chaque invariant critique. Toute modification future qui violerait ces règles sera automatiquement bloquée avant mise en production.

---

## BLOC 2 — AVANT / APRÈS

| Dimension | AVANT | APRÈS |
|---|---|---|
| **Comportement par défaut** | ⛔ Permissif — accès accordé si la clé n'est pas configurée | ✅ Restrictif — accès refusé si la clé n'est pas explicitement autorisée |
| **Isolation STARTER / PRO** | ⛔ Poreuse — un STARTER pouvait accéder à des fonctions PRO | ✅ Étanche — chaque plan n'accède qu'à ses modules autorisés |
| **Clés fantômes** | ⛔ 4 clés visibles en admin sans effet runtime (`commercial.suivi_client`, `comparateur`, `veille`, `prospects`) | ✅ Supprimées — l'admin ne voit que des clés réellement contrôlées |
| **Cohérence frontend / backend** | ⛔ Ambiguë — certaines clés frontend ne correspondaient à rien côté serveur | ✅ Alignée — chaque clé frontend a une source serveur vérifiable |
| **Overrides utilisateur** | ⛔ Potentiellement incohérents avec les plans | ✅ Cohérents — un override ne peut pas contourner un plan manquant |
| **Protection anti-régression** | ⛔ Aucune — le problème pouvait revenir silencieusement | ✅ 434 tests CI bloquants couvrant les invariants critiques |
| **Documentation** | ⛔ Absente | ✅ Référence complète (`PERMISSIONS-REFERENCE.md`) avec inventaire des clés et procédure d'ajout |
| **Doctrine de contribution** | ⛔ Inexistante — tout développeur pouvait ajouter une clé sans vérification | ✅ Procédure en 9 étapes avec garde-fous automatisés |

---

## BLOC 3 — PÉRIMÈTRE VOLONTAIREMENT EXCLU

### 1. `organisation.documents_legaux` — hors runtime plan

**Situation** : Cette clé existe dans le registre des modules (`MODULES`) mais n'a volontairement **aucune entrée** dans `plan_tier_modules`.

**Pourquoi ce n'est pas un bug** : Cette fonctionnalité n'est pas encore consommée en production. L'ajouter aux plans maintenant créerait un droit « sur le papier » sans garde runtime réel, ce qui est exactement le type d'incohérence que ce chantier a éliminé.

**Quand la raccorder** :
- Dès qu'un composant UI consomme effectivement `hasModule('organisation.documents_legaux')` en production.
- À ce moment : ajouter une migration SQL dans `plan_tier_modules` avec le tier approprié, puis mettre à jour les tests.

### 2. `pilotage.statistiques` — conteneur structurel

**Situation** : Cette clé existe dans `MODULES` mais n'a **pas d'entrée** dans `MODULE_DEFINITIONS`. Elle sert uniquement de préfixe parent pour 6 sous-clés réelles :

| Sous-clé | Plan minimum |
|---|---|
| `pilotage.statistiques.general` | STARTER |
| `pilotage.statistiques.apporteurs` | PRO |
| `pilotage.statistiques.techniciens` | PRO |
| `pilotage.statistiques.univers` | PRO |
| `pilotage.statistiques.sav` | PRO |
| `pilotage.statistiques.previsionnel` | PRO |

**Pourquoi ce n'est pas un bug** : C'est une architecture volontaire de type « conteneur + sous-clés ». Le conteneur lui-même n'accorde aucun droit — seules les sous-clés sont vérifiées au runtime. Cette architecture est couverte par les tests (Rule 7 du `new-module-checklist`).

**Règle pour toute future sous-clé stats** :
1. Ajouter la sous-clé dans `MODULES` (ex : `pilotage.statistiques.nouveau`)
2. Ajouter l'entrée correspondante dans `plan_tier_modules` via migration SQL
3. Ne **jamais** transformer le conteneur `pilotage.statistiques` en permission autonome

### 3. Modules non déployés (`deployed: false`)

**Situation** : Certains modules sont marqués `deployed: false` dans `MODULE_DEFINITIONS`. Ils sont visibles dans le code mais inactifs.

**Pourquoi ce n'est pas un bug** : Ces modules sont en attente de développement. Le test CI (Rule 6) garantit qu'ils ne peuvent pas être activés par défaut dans un plan. Ils n'apparaissent pas dans les interfaces utilisateur.

**Quand les activer** : Lorsque le développement est terminé, passer `deployed: true`, ajouter les entrées `plan_tier_modules`, et mettre à jour `PLAN_VISIBLE_MODULES`.

---

## BLOC 4 — GARANTIES OPÉRATIONNELLES

Les affirmations suivantes sont **vraies en production** et **vérifiées automatiquement par la suite de tests CI** :

| # | Garantie | Vérification |
|---|---|---|
| G1 | **Un utilisateur STARTER ne voit plus de fonctionnalités PRO par défaut** | Test `fail-closed-regression` : les 8 clés PRO sont explicitement refusées pour STARTER |
| G2 | **Un utilisateur PRO récupère tous ses droits attendus** | Test `fail-closed-regression` : les clés PRO sont explicitement autorisées pour PRO |
| G3 | **Une clé absente de la configuration n'ouvre plus aucun accès** | RPC `COALESCE(ptm.enabled, false)` + tests `fail-open-prevention` |
| G4 | **Les overrides individuels (user_modules) restent cohérents** | Test `fail-closed-regression` : un override `enabled: true` autorise, `enabled: false` refuse |
| G5 | **Les clés fantômes ne peuvent plus polluer le système** | Tests `coherence-audit` : toute clé dans `MODULE_DEFINITIONS` doit exister dans `MODULES`, et inversement |
| G6 | **Un futur module ajouté sans respecter la procédure sera bloqué par le CI** | 10 règles structurelles dans `new-module-checklist.test.ts` |
| G7 | **Seuls les rôles N5+ (platform_admin, superadmin) peuvent contourner les vérifications de modules** | Test `fail-open-prevention` : bypass strictement limité |
| G8 | **Un module `deployed: false` ne peut pas être activé par défaut** | Rule 6 du `new-module-checklist` |

---

## BLOC 5 — RECOMMANDATION DE GOUVERNANCE

### Qui peut modifier les permissions ?

| Action | Qui | Validation requise |
|---|---|---|
| Ajouter un nouveau module | Développeur | Migration SQL + tests + revue de code |
| Modifier les droits d'un plan (STARTER/PRO) | Administrateur technique | Migration SQL uniquement — pas de changement côté code |
| Créer un override utilisateur | Admin agence (via UI) | Aucune — le système est conçu pour ça |
| Modifier le moteur de permissions | Développeur senior | Revue de code obligatoire + tous les tests CI doivent passer |

### Vérifications obligatoires avant mise en production

Toute modification touchant aux permissions **doit** :

1. ✅ Passer les 434+ tests de la suite CI sans régression
2. ✅ Ne pas réintroduire de pattern `COALESCE(..., true)` ou équivalent permissif
3. ✅ Respecter la procédure en 9 étapes documentée dans `PERMISSIONS-REFERENCE.md` §6
4. ✅ Être accompagnée d'une migration SQL si elle touche à `plan_tier_modules`

### Quand un nouveau module doit passer par migration SQL + tests + documentation

**Toujours**, sans exception, si le module :

- Accorde ou restreint un accès utilisateur
- Apparaît dans un menu, une page ou un composant conditionnel
- Est lié à un plan (STARTER, PRO)
- Est consommé par `hasModule()` ou `hasModuleOption()` dans le code

**La seule exception** : un module purement cosmétique (label d'affichage sans garde d'accès).

### Erreurs qui ne doivent plus jamais être tolérées

| ❌ Interdit | Pourquoi |
|---|---|
| `COALESCE(ptm.enabled, true)` dans une RPC | Réouvre la faille fail-open |
| Ajouter une clé dans `MODULES` sans entrée `plan_tier_modules` | Crée une clé fantôme non contrôlée |
| Ajouter un `ModuleKey` dans le type sans l'enregistrer dans `MODULE_DEFINITIONS` | Divergence type/runtime |
| Vérifier un rôle admin via `localStorage` | Contournable par l'utilisateur — faille de sécurité |
| Désactiver ou ignorer les tests `new-module-checklist` | Supprime le dernier filet de sécurité |
| Utiliser une clé structurelle (`pilotage`, `admin`, `commercial`) comme permission autonome | Accorde implicitement l'accès à toutes les sous-fonctionnalités |

---

## ANNEXES

- **Référence technique complète** : `docs/PERMISSIONS-REFERENCE.md`
- **Tests de verrouillage** : `src/permissions/__tests__/`
  - `fail-closed-regression.test.ts` — isolation des plans
  - `coherence-audit.test.ts` — cohérence structurelle
  - `fail-open-prevention.test.ts` — interdiction du fail-open
  - `new-module-checklist.test.ts` — garde-fous pour les ajouts futurs
  - `permissions-lockdown.test.ts` — verrouillage général
