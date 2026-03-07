

# Entrées manquantes dans `module_registry`

## Constat

En comparant les clés dans `module_registry` (DB) avec ce que `MODULE_DEFINITIONS` (code) déclare et ce que le code utilise réellement via `hasModuleOption`, voici les entrées **absentes** du registre :

| Clé manquante | Parent | Type | Description | min_role | Plan | Déployé |
|---|---|---|---|---|---|---|
| `aide.agent` | `aide` | feature | Agent support (répondre aux demandes) | 0 | STARTER | true |
| `admin_plateforme.users` | `admin_plateforme` | feature | Gestion des utilisateurs | 5 | PRO | true |
| `admin_plateforme.agencies` | `admin_plateforme` | feature | Configuration agences | 5 | PRO | true |
| `admin_plateforme.permissions` | `admin_plateforme` | feature | Gestion des droits | 5 | PRO | true |
| `guides.edition` | `guides` | feature | Édition des guides (utilisé par `hasModuleOption('help_academy','edition')` et `hasModuleOption('guides','edition')`) | 5 | PRO | true |

### Modules non-déployés (à considérer pour plus tard) :

| Clé | Description | Statut dans le code |
|---|---|---|
| `outils.prospection.*` | Commercial / Prospection (dashboard, comparateur, veille, prospects) | `deployed: false` dans MODULE_DEFINITIONS |
| `planning_augmente.*` | Planification IA (suggest, optimize, admin) | `deployed: false` dans MODULE_DEFINITIONS |

### Clés dans le registre SANS équivalent dans MODULE_DEFINITIONS (orphelines) :

| Clé | Remarque |
|---|---|
| `outils.commercial` | Section vide, pas d'enfants. Doublon potentiel avec prospection ? |
| `outils.performance` | Section vide, pas d'enfants |
| `stats.sav` | Pas dans MODULE_OPTIONS |
| `stats.previsionnel` | Pas dans MODULE_OPTIONS |
| `stats.techniciens` | Pas dans MODULE_OPTIONS |
| `stats.univers` | Pas dans MODULE_OPTIONS |
| `stats.apporteurs` | Pas dans MODULE_OPTIONS |

Les stats supplémentaires (sav, previsionnel, techniciens, univers, apporteurs) existent dans le registre mais pas dans `MODULE_OPTIONS`. Elles sont probablement des écrans de stats valides mais non modélisés côté code.

## Plan d'action

### Migration SQL — Insérer les 5 entrées manquantes confirmées

```sql
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('aide.agent',                  'Agent',        'aide',              'feature', 2, true, 'STARTER', 0),
  ('admin_plateforme.users',      'Utilisateurs', 'admin_plateforme',  'feature', 1, true, 'PRO', 5),
  ('admin_plateforme.agencies',   'Agences',      'admin_plateforme',  'feature', 2, true, 'PRO', 5),
  ('admin_plateforme.permissions','Permissions',  'admin_plateforme',  'feature', 3, true, 'PRO', 5),
  ('guides.edition',              'Édition',      'guides',            'feature', 5, true, 'PRO', 5);
```

### Aucun changement UI nécessaire

Le `ModulesMasterView` lit dynamiquement le registre — les nouvelles lignes apparaîtront automatiquement.

### Question pour toi

Les clés orphelines (`outils.commercial`, `outils.performance`, `stats.sav`, `stats.previsionnel`, `stats.techniciens`, `stats.univers`, `stats.apporteurs`) :
- Faut-il les garder telles quelles ?
- Faut-il en supprimer certaines ?
- Faut-il ajouter les stats manquantes dans `MODULE_OPTIONS` côté code ?

