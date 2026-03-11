## Audit de cohérence : Droits / Niveaux / Rôles

### Synthèse

L'audit révèle **3 bugs critiques** et **2 problèmes structurels** dans le système de permissions.

---

### BUG CRITIQUE 1 — Commercial : sous-onglets invisibles pour la plupart des utilisateurs

**Symptôme** : Un utilisateur PRO N2 (dirigeant agence) accède à l'onglet Commercial mais ne voit que "Réalisations". Les 4 autres sous-onglets (Suivi client, Comparateur, Veille, Prospects) sont masqués.

**Cause** : `CommercialTabContent` filtre les tabs avec `hasModuleOption('prospection', 'dashboard')`, etc. Or :

- Le module `prospection` est bien déployé (registry, PRO, min_role=1)
- Mais les **options** (dashboard, comparateur, veille, prospects) ne sont **jamais remplies automatiquement**
- La RPC `get_user_effective_modules` retourne `prospection` avec `options: {}` depuis le registry
- Seuls **3 utilisateurs** ont des options via `user_modules` (overrides manuels)
- Tous les autres utilisateurs PRO voient un onglet Commercial quasi vide

**Correction** : Soit ajouter les options dans `plan_tier_modules.options_override` pour le tier PRO, soit modifier le code pour ne plus filtrer par options (afficher tous les sous-onglets si le module `prospection` est actif).

---

### BUG CRITIQUE 2 — Documents : options "Gérer" et "Corbeille" cassées

**Symptôme** : Les onglets "Raccourcis" et "Corbeille" dans Documents ne s'affichent jamais pour les utilisateurs non-admin.

**Cause** : Conflit de clés entre deux entrées DB :

- Code : `hasModuleOption('divers_documents', 'gerer')` 
- DB : les options existent sous `documents.gerer` (parent = `documents`), pas sous `divers_documents`
- `divers_documents` n'a **aucun enfant** dans module_registry
- Résultat : `options` toujours `{}` → `canManage` = false

**Correction** : Soit migrer les enfants de `documents` sous `divers_documents`, soit harmoniser le code pour utiliser la bonne clé.

---

### BUG 3 — Ticketing : accès uniquement par override individuel

**Symptôme** : Le module ticketing n'est accessible qu'aux utilisateurs ayant un override dans `user_modules` (6 utilisateurs actuellement).

**Cause** : 

- `module_registry.ticketing.required_plan = 'NONE'` → exclu du plan automatique (la RPC filtre `effective_plan != 'NONE'`)
- `plan_tier_modules.ticketing.enabled = false` pour les deux tiers
- Seule voie d'accès : `user_modules` override

**Question** : Est-ce intentionnel (ticketing = opt-in individuel) ou un bug ? Si intentionnel, c'est cohérent mais à documenter.

---

### PROBLÈME STRUCTUREL 1 — Catégories fantômes dans la page Droits

La page Droits affiche l'arbre brut de `module_registry`. **18 entrées racine** (parent_key = NULL) s'affichent à plat sans catégorisation. Parmi elles :


| Clé DB              | Label affiché       | Statut                                                                   |
| ------------------- | ------------------- | ------------------------------------------------------------------------ |
| `salaries`          | Salariés            | **DOUBLON** de `rh` (même fonction, mêmes sous-options)                  |
| `outils`            | Outils              | **LEGACY** (ancien conteneur, 6 enfants orphelins)                       |
| `documents`         | Documents           | **DOUBLON** de `divers_documents` (mais c'est celui qui a les enfants !) |
| `rh`                | Ressources humaines | Actif mais affiché comme catégorie principale                            |
| `divers_reunions`   | Réunions            | Actif mais affiché comme catégorie principale                            |
| `divers_apporteurs` | Apporteurs          | Actif mais affiché comme catégorie principale                            |


Aucune de ces entrées n'est regroupée sous les 7 catégories de navigation.

---

### PROBLÈME STRUCTUREL 2 — sort_order incohérent

9 modules racine ont `sort_order = 0`, ce qui rend l'ordre d'affichage aléatoire dans la page Droits.

---

### MATRICE DE COHÉRENCE RÔLES / PLANS


| Module (clé DB)      | Nav UI       | min_role | Plan requis | Accessible ?              | Verdict         |
| -------------------- | ------------ | -------- | ----------- | ------------------------- | --------------- |
| `agence`             | Pilotage     | N2       | STARTER     | OK via registry           | OK              |
| `stats`              | Pilotage     | N2       | PRO         | OK via registry           | OK              |
| `prospection`        | Commercial   | N1       | PRO         | Module OK, **options KO** | **BUG**         |
| `realisations`       | Commercial   | N2       | PRO         | OK via registry           | OK              |
| `rh`                 | Organisation | N2       | PRO         | OK via registry           | OK              |
| `divers_apporteurs`  | Organisation | N2       | PRO         | OK via registry           | OK              |
| `divers_plannings`   | Organisation | N2       | STARTER     | OK via registry           | OK              |
| `divers_reunions`    | Organisation | N2       | STARTER     | OK via registry           | OK              |
| `parc`               | Organisation | N2       | PRO         | OK via registry           | OK              |
| `divers_documents`   | Documents    | N2       | STARTER     | Module OK, **options KO** | **BUG**         |
| `aide`               | Support      | N0       | STARTER     | OK                        | OK              |
| `guides`             | Support      | N2       | STARTER     | OK                        | OK              |
| `ticketing`          | Support      | N0       | NONE        | **Override only**         | **A confirmer** |
| `admin_plateforme`   | Admin        | N5       | PRO         | OK                        | OK              |
| `reseau_franchiseur` | Franchiseur  | N3       | PRO         | OK                        | OK              |


---

### PLAN DE CORRECTION (par priorité)

**P0 — Corriger les options Commercial** (impact : tous les utilisateurs PRO)

- Soit : ajouter `options_override = {"dashboard":true,"comparateur":true,"veille":true,"prospects":true}` dans `plan_tier_modules` pour PRO
- Soit : modifier `CommercialTabContent` pour afficher les sous-onglets dès que `hasModule('prospection')` est true (plus simple, recommandé)

**P0 — Corriger les options Documents**

- Migrer les enfants DB de `documents.*` sous `divers_documents.*` (renommer parent_key)
- OU modifier le code Documents pour utiliser `hasModule('documents.gerer')` au lieu de `hasModuleOption('divers_documents', 'gerer')`
- Solution recommandée : modifier le code pour checker `hasModule('documents.gerer')` car ces enfants existent comme modules autonomes dans le registry

**P1 — Restructurer l'affichage Droits** (taxonomie virtuelle, comme planifié précédemment)

**P2 — Nettoyer les doublons DB** (archiver `salaries`, `outils`, `documents` legacy)

**P2 — Corriger les sort_order** pour un affichage stable

---

### Confirmations nécessaires avant correction

1. **Commercial** : Préférez-vous que TOUS les sous-onglets soient visibles dès que le module `prospection` est actif (plus simple), ou garder le contrôle granulaire par option (nécessite de remplir les options dans les plans) ? je veux la granulité  

2. **Ticketing** : Le mode "override individuel uniquement" est-il intentionnel ? oui  
personne n'accede a ticketing, sauf les utilisateurs ayant deja l'autorisation actuellement ET de futurs utilisateurs a qui on attribuerait ce droit  
ce nest pas un module lié a un "plan" c'est a part  
  
  
Pour la gestino de tout les droits il faut appliquer le meme principe. sans perdre les droits actuels  
pour pas faire de betises, tu peux passer TOUSl es modules e "PRO" provisoirement, et mettre a jour les tables correspondentes et tout ce qui doit l'ztre.  
Je passerait ensuite sur la page de drits, pour attribuer moi meme le plan basique a certaies categories "toujours. accessibles"   

3.   
