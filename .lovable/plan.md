## Plan: Ajouter la contrainte critique Ticketing au plan de migration

Ajouter une section dédiée dans `.lovable/plan.md` documentant la contrainte de production Ticketing et les règles de compatibilité obligatoires pour la migration C2.

### Modification

**Fichier** : `.lovable/plan.md`

Ajouter en fin de fichier une nouvelle section :

```markdown
---

## C2 — Refonte Permissions Fines (en cours)

### CONTRAINTE CRITIQUE — Module Ticketing en production

La plateforme est déjà utilisée en production pour le module Ticketing.
Les utilisateurs actuels doivent conserver leur accès sans interruption pendant toute la migration.

La clé historique `ticketing` doit rester fonctionnelle jusqu'à la phase finale de nettoyage (Phase 7).

**Compatibilité obligatoire :**

```

support.ticketing ← ticketing

```

Cette compatibilité doit être active dans :
- Le moteur frontend (`hasModule` via `COMPAT_MAP`)
- La RPC `get_user_effective_modules`
- Tous les guards UI utilisant le module ticketing

**Pré-requis avant migration des guards Ticketing :**

Avant toute modification de guard passant de `ticketing` à `support.ticketing`, un test doit confirmer :

```

hasModule("support.ticketing") === true

```

pour un utilisateur possédant **uniquement** la clé `ticketing` dans `user_modules`.

**Règle absolue :** Aucune modification des guards Ticketing ne doit être faite tant que cette compatibilité n'est pas active et vérifiée.
```

Pas d'autre fichier modifié. Ajout documentaire uniquement.

&nbsp;

&nbsp;

## Réponses aux 3 points de validation

### 1. Cohérence `min_role` parent/enfant — mediatheque

Source actuelle dans `module_registry` :

| Clé existante               | min_role |

| --------------------------- | -------- |

| `documents`                 | 2        |

| `documents.consulter`       | 2        |

| `documents.gerer`           | 2        |

| `documents.corbeille_vider` | 2        |

Tous alignés à 2. Mon plan Phase 1.5 contenait une erreur : `mediatheque.gerer` était proposé à `min_role = 1`. C'est incohérent avec la source.

**Correction appliquée** : tous les nœuds `mediatheque.*` seront à `min_role = 2`, fidèle à la source `documents.*`.

| Noeud cible             | min_role corrigé         |

| ----------------------- | ------------------------ |

| `mediatheque`           | 2                        |

| `mediatheque.consulter` | 2                        |

| `mediatheque.gerer`     | **2** (corrigé, était 1) |

| `mediatheque.corbeille` | 2                        |

Aucun enfant plus permissif que son parent.

---

### 2. Politique `support.guides` — min_role

Valeur actuelle en DB : `**guides` = min_role 1** (pas 2 comme écrit dans mon plan).

Détail des enfants :

| Clé                  | min_role |

| -------------------- | -------- |

| `guides`             | 1        |

| `guides.apogee`      | 1        |

| `guides.apporteurs`  | 2        |

| `guides.helpconfort` | 2        |

| `guides.faq`         | 2        |

| `guides.edition`     | 2        |

Le parent à 1 est cohérent : il permet l'accès au module Guides dès le rôle N1 (franchisee_user), mais certains guides spécifiques exigent N2+.

**Correction appliquée** : `support.guides` sera à `min_role = 1` (fidèle à la source), pas 2.

---

### 3. Politique `required_plan` parent/enfant

Confirmé par le code dans `useModuleRegistry.ts` (lignes 64-65) :

```text

// Rule 2: each node uses its OWN required_plan (no parent inheritance)

const effectivePlan: PlanLevel = row.required_plan;

```

Le `required_plan` est **par nœud, sans héritage descendant**. Un parent STARTER peut avoir des enfants PRO. C'est le comportement voulu et implémenté.

Les modules racines servent de conteneurs. Leur `required_plan` détermine uniquement leur propre visibilité, pas celle de leurs enfants.

---

### Tableau final corrigé des 42 nœuds (Phase 2)

| #   | key                                  | parent_key            | node_type | required_plan | min_role |

| --- | ------------------------------------ | --------------------- | --------- | ------------- | -------- |

| 1   | `pilotage`                           | NULL                  | module    | STARTER       | 2        |

| 2   | `pilotage.statistiques`              | pilotage              | section   | STARTER       | 2        |

| 3   | `pilotage.statistiques.general`      | pilotage.statistiques | screen    | STARTER       | 2        |

| 4   | `pilotage.statistiques.apporteurs`   | pilotage.statistiques | screen    | PRO           | 2        |

| 5   | `pilotage.statistiques.techniciens`  | pilotage.statistiques | screen    | PRO           | 2        |

| 6   | `pilotage.statistiques.univers`      | pilotage.statistiques | screen    | PRO           | 2        |

| 7   | `pilotage.statistiques.sav`          | pilotage.statistiques | screen    | PRO           | 2        |

| 8   | `pilotage.statistiques.previsionnel` | pilotage.statistiques | screen    | PRO           | 2        |

| 9   | `pilotage.statistiques.exports`      | pilotage.statistiques | feature   | PRO           | 2        |

| 10  | `pilotage.performance`               | pilotage              | section   | STARTER       | 2        |

| 11  | `pilotage.actions_a_mener`           | pilotage              | section   | STARTER       | 2        |

| 12  | `pilotage.devis_acceptes`            | pilotage              | section   | STARTER       | 2        |

| 13  | `pilotage.incoherences`              | pilotage              | section   | STARTER       | 2        |

| 14  | `commercial`                         | NULL                  | module    | PRO           | 1        |

| 15  | `commercial.suivi_client`            | commercial            | section   | PRO           | 1        |

| 16  | `commercial.comparateur`             | commercial            | section   | PRO           | 1        |

| 17  | `commercial.veille`                  | commercial            | section   | PRO           | 1        |

| 18  | `commercial.prospects`               | commercial            | section   | PRO           | 1        |

| 19  | `commercial.realisations`            | commercial            | section   | PRO           | 2        |

| 20  | `organisation`                       | NULL                  | module    | STARTER       | 1        |

| 21  | `organisation.salaries`              | organisation          | section   | STARTER       | 1        |

| 22  | `organisation.apporteurs`            | organisation          | section   | PRO           | 1        |

| 23  | `organisation.plannings`             | organisation          | section   | STARTER       | 1        |

| 24  | `organisation.reunions`              | organisation          | section   | PRO           | 1        |

| 25  | `organisation.parc`                  | organisation          | section   | PRO           | 1        |

| 26  | `organisation.documents_legaux`      | organisation          | section   | STARTER       | 2        |

| 27  | `mediatheque`                        | NULL                  | module    | STARTER       | 2        |

| 28  | `mediatheque.consulter`              | mediatheque           | feature   | STARTER       | 2        |

| 29  | `mediatheque.gerer`                  | mediatheque           | feature   | STARTER       | 2        |

| 30  | `mediatheque.corbeille`              | mediatheque           | feature   | PRO           | 2        |

| 31  | `support`                            | NULL                  | module    | STARTER       | 0        |

| 32  | `support.aide_en_ligne`              | support               | section   | STARTER       | 0        |

| 33  | `support.guides`                     | support               | section   | STARTER       | 1        |

| 34  | `support.faq`                        | support               | section   | STARTER       | 0        |

| 35  | `support.ticketing`                  | support               | section   | NONE          | 0        |

| 36  | `admin`                              | NULL                  | module    | NONE          | 5        |

| 37  | `admin.gestion`                      | admin                 | section   | NONE          | 5        |

| 38  | `admin.franchiseur`                  | admin                 | section   | NONE          | 3        |

| 39  | `admin.ia`                           | admin                 | section   | NONE          | 5        |

| 40  | `admin.contenu`                      | admin                 | section   | NONE          | 5        |

| 41  | `admin.ops`                          | admin                 | section   | NONE          | 5        |

| 42  | `admin.plateforme`                   | admin                 | section   | NONE          | 5        |

### Exécution Phase 2

1. **ALTER TYPE** : ajouter `'module'` à l'enum `node_type` dans `module_registry` (si c'est un enum DB) ou vérifier que c'est un text/varchar

2. **42 INSERT** dans `module_registry` avec `is_deployed = true`, `sort_order` séquentiel par parent

3. **Frontend** : ajouter `'module'` au type `NodeType` dans `useModuleRegistry.ts`

4. **rightsTaxonomy.ts** : mettre à jour les `moduleKeys` pour inclure les nouveaux préfixes `pilotage`, `commercial`, `organisation`, `mediatheque`, `support`, `admin`) en plus des anciens

Aucun guard modifie. Aucune clé existante touchee. Les anciens noeuds restent intacts.  

  

  

    
  
