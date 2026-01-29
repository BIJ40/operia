
# Plan : Refonte des modules et interface de gestion des plans

## Contexte

L'interface a évolué avec de nouveaux onglets, mais les définitions de modules dans le code et la base de données ne correspondent plus à la réalité de l'application. Il faut :
1. Redéfinir la liste des modules pour qu'elle corresponde aux onglets actuels
2. Créer une interface d'administration pour gérer les plans (Basique/Pro)

---

## Phase 1 : Refonte de la liste des modules

### Nouvelle structure des modules

| Onglet UI | Module Key | Label | Sous-options |
|-----------|------------|-------|--------------|
| Mon agence | `agence` | Mon agence | indicateurs, actions_a_mener, diffusion |
| Stats | `stats` | Statistiques | stats_hub, exports |
| Salariés | `rh` | Salariés (RH) | rh_viewer, rh_admin |
| Parc | `parc` | Parc | vehicules, epi, equipements |
| Divers > Apporteurs | `divers_apporteurs` | Apporteurs | consulter, gerer |
| Divers > Plannings | `divers_plannings` | Plannings | - |
| Divers > Réunions | `divers_reunions` | Réunions | - |
| Divers > Documents | `divers_documents` | Documents | - |
| Guides | `guides` | Guides | apogee, apporteurs, helpconfort, faq |
| Ticketing | `ticketing` | Ticketing | kanban, create, manage, import |
| Aide | `aide` | Aide | user, agent |

### Fichiers à modifier

1. **`src/types/modules.ts`** :
   - Renommer les modules existants pour correspondre aux onglets
   - Simplifier les sous-options
   - Supprimer les modules obsolètes (`reseau_franchiseur`, `admin_plateforme`, `unified_search` - ces derniers sont réservés aux admins)

2. **`src/pages/UnifiedWorkspace.tsx`** :
   - Mettre à jour les `requiresOption` de chaque onglet

---

## Phase 2 : Interface de gestion des plans

### Ajout d'un sous-onglet "Plans" dans Admin > Gestion

**Emplacement** : `Admin > Gestion > Plans`

**Composant** : `src/components/admin/views/PlansManagerView.tsx`

### Fonctionnalités de l'interface

```text
┌────────────────────────────────────────────────────────────────┐
│  Plans                                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┬─────────────────────┐                  │
│  │     Module          │  Basique  │   Pro   │                  │
│  ├─────────────────────┼───────────┼─────────┤                  │
│  │ Mon agence          │    ✓      │    ✓    │                  │
│  │ Stats               │    ○      │    ✓    │                  │
│  │ Salariés (RH)       │    ○      │    ✓    │                  │
│  │ Parc                │    ○      │    ✓    │                  │
│  │ Divers > Apporteurs │    ✓      │    ✓    │                  │
│  │ Divers > Plannings  │    ✓      │    ✓    │                  │
│  │ Divers > Réunions   │    ○      │    ✓    │                  │
│  │ Divers > Documents  │    ○      │    ✓    │                  │
│  │ Guides              │    ✓      │    ✓    │                  │
│  │ Ticketing           │    ○      │    ✓    │                  │
│  │ Aide                │    ✓      │    ✓    │                  │
│  └─────────────────────┴───────────┴─────────┘                  │
│                                                                  │
│  ○ = Non inclus    ✓ = Inclus                                   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Structure du composant

- Affichage en matrice : modules en lignes, plans en colonnes
- Switch toggle pour activer/désactiver un module dans un plan
- Sauvegarde automatique à chaque changement
- Utilisation des hooks existants : `usePlanTiers`, `useUpdatePlanTierModule`

---

## Phase 3 : Mise à jour de la base de données

### Migration SQL

1. **Mettre à jour `plan_tier_modules`** avec les nouveaux module_key
2. **Initialiser tous les modules en "Basique"** par défaut (l'utilisateur ajustera ensuite)

```sql
-- Supprimer les anciens modules
DELETE FROM plan_tier_modules;

-- Insérer les nouveaux modules pour chaque plan
-- STARTER (Basique)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
('STARTER', 'agence', true, '{"indicateurs": true, "actions_a_mener": true, "diffusion": true}'),
('STARTER', 'stats', true, '{}'),
('STARTER', 'rh', true, '{}'),
('STARTER', 'parc', true, '{}'),
('STARTER', 'divers_apporteurs', true, '{}'),
('STARTER', 'divers_plannings', true, '{}'),
('STARTER', 'divers_reunions', true, '{}'),
('STARTER', 'divers_documents', true, '{}'),
('STARTER', 'guides', true, '{}'),
('STARTER', 'ticketing', true, '{}'),
('STARTER', 'aide', true, '{}');

-- PRO (copie de STARTER + tous les modules)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
('PRO', 'agence', true, '{"indicateurs": true, "actions_a_mener": true, "diffusion": true}'),
...
```

---

## Phase 4 : Mise à jour de l'interface utilisateur par utilisateur

### À faire dans une étape ultérieure

L'interface de gestion des modules **par utilisateur** (`InlineModuleBadges.tsx`) devra être mise à jour pour :
- Afficher les nouveaux modules
- Permettre les overrides individuels
- Afficher clairement ce qui vient du plan vs ce qui est un override

---

## Fichiers à créer/modifier

| Action | Fichier |
|--------|---------|
| Créer | `src/components/admin/views/PlansManagerView.tsx` |
| Modifier | `src/components/unified/tabs/AdminHubContent.tsx` (ajouter onglet Plans) |
| Modifier | `src/types/modules.ts` (nouvelle liste de modules) |
| Modifier | `src/pages/UnifiedWorkspace.tsx` (requiresOption alignés) |
| Migration | Mise à jour `plan_tier_modules` |

---

## Résumé des étapes

1. ✏️ Créer le composant `PlansManagerView.tsx` avec la matrice modules/plans
2. ✏️ Ajouter l'onglet "Plans" dans `AdminHubContent.tsx`
3. ✏️ Mettre à jour `src/types/modules.ts` avec les nouveaux modules
4. ✏️ Mettre à jour les `requiresOption` dans `UnifiedWorkspace.tsx`
5. 🗄️ Migration SQL pour aligner `plan_tier_modules`

---

## Questions avant implémentation

Avant de procéder, je voudrais confirmer :

1. **Divers** : Voulez-vous que chaque sous-section (Apporteurs, Plannings, Réunions, Documents) soit un module séparé qu'on peut activer/désactiver individuellement, ou préférez-vous un seul module "Divers" global ?

2. **Modules admin** : `reseau_franchiseur` et `admin_plateforme` doivent-ils rester dans la liste (réservés N3+) ou les retirer complètement du système de plans ?

3. **Valeurs par défaut** : Voulez-vous que je mette **tout en Basique** par défaut et vous ajusterez ensuite via l'interface, ou avez-vous déjà une idée de ce qui doit être Pro uniquement ?
