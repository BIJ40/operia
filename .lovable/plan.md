# Diagnostic : Ticketing dupliqué + modules dev disparus

## 1. Ticketing en double

La base `module_registry` contient **deux entrées Ticketing** :


| key                 | parent_key    | node_type | sort_order |
| ------------------- | ------------- | --------- | ---------- |
| `ticketing`         | NULL (racine) | section   | 60         |
| `support.ticketing` | `support`     | section   | 40         |


Les enfants (kanban, create, manage, import) ont `parent_key = 'ticketing'` (la racine orpheline).

**Correction** : supprimer `support.ticketing` (doublon), reparenter `ticketing` sous `support` (`parent_key = 'support'`), et changer son `node_type` en `module` (bleu). Les enfants restent inchanges avec leurs types actuels (screen/feature = violet).

## 2. Modules "en développement" disparus

Tous les modules en base ont `is_deployed = true`. Deux modules n'existent **pas du tout** dans `module_registry` :


| Module                         | Statut base          | Statut code                                      |
| ------------------------------ | -------------------- | ------------------------------------------------ |
| `planning_augmente`            | Absent du registre   | Existe dans MODULE_DEFINITIONS, constants, types |
| DocGen (`organisation.docgen`) | Absent du registre   | Existe dans routes, hooks, composants            |
| `ticketing.import`             | `is_deployed = true` | Devrait etre dev                                 |
| `organisation.reunions`        | `is_deployed = true` | Devrait etre dev                                 |
| `pilotage.performance`         | `is_deployed = true` | Devrait etre dev                                 |


**Correction** :

- Inserer `planning_augmente` et `organisation.docgen` dans `module_registry` avec `is_deployed = false`
- Remettre `ticketing.import`, `organisation.reunions`, `pilotage.performance` a `is_deployed = false`

## 3. Actions SQL

```sql
-- 1. Supprimer le doublon support.ticketing
DELETE FROM module_registry WHERE key = 'support.ticketing';

-- 2. Reparenter ticketing sous support, type module (bleu)
UPDATE module_registry SET parent_key = 'support', node_type = 'module' WHERE key = 'ticketing';

-- 3. Restaurer les 3 modules dev
UPDATE module_registry SET is_deployed = false WHERE key IN ('ticketing.import', 'organisation.reunions', 'pilotage.performance');

-- 4. Inserer les 2 modules manquants
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES 
  ('planning_augmente', 'Planification Augmentée', NULL, 'module', 70, false, 'PRO', 2),
  ('organisation.docgen', 'DocGen', 'organisation', 'section', 60, false, 'PRO', 2);
```

## 4. Mise a jour taxonomie

Ajouter `planning_augmente` dans la categorie appropriee de `rightsTaxonomy.ts`, et mettre a jour `support.moduleKeys` pour remplacer `ticketing` tel quel (le prefixe match via `nodeMatchesCategory`).

## 5. Perimetre strict

- Uniquement des corrections de donnees DB + taxonomie
- Aucun changement au moteur runtime, aux guards, aux tabs, ni aux composants

&nbsp;

Liste n'est pas présent sous TICKETING  
  
Ya dautres incoherences de correspondance des noms :  
C'est quoi " agence " dans pilotage   
la page agence n'existe pasdans le menu  
je vois pas a quo ielle correspond, mais elle devrait pas etre la !

&nbsp;