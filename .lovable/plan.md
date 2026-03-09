

# Plan : Planification Intelligente (IA) dans Planning V2

## Contexte existant

Le projet a déjà une base solide :
- **Edge function `suggest-planning`** : moteur de scoring (hard constraints + soft scoring) qui propose des créneaux optimaux pour un dossier donné, basé sur compétences, charge, distance, équité
- **Edge function `optimize-week`** : détecte les rééquilibrages possibles (swap/move/reassign) sur 2 semaines
- **Table `planning_optimizer_config`** : stocke les poids (weights) et contraintes dures par agence
- **Tables `technician_skills` + `technician_profile`** : compétences structurées et profils (amplitude, jours travaillés, géo)
- **Hook `usePlanningAugmente`** : hooks React Query pour consommer ces edge functions
- **Panel `UnscheduledPanel`** : liste les dossiers non planifiés (1er RDV / Travaux)

Ce qui manque : **l'interface utilisateur** pour piloter tout ça depuis le Planning V2.

## Ce qu'on va construire

### 1. Bouton "Planifier" sur chaque carte non planifiée
Ajouter un bouton sur chaque `UnscheduledCard` qui ouvre un **drawer de suggestions IA**. Au clic :
- Appel à `suggest-planning` avec le `dossier_id` et l'`agency_id`
- Affichage des 3 meilleures suggestions (tech, date, heure, score, raisons) sous forme de cartes visuelles
- Bouton "Voir alternatives" pour les 10 suivantes
- Bouton "Appliquer" qui appelle `apply-planning-action` (edge function existante) pour créer le créneau dans Apogée

### 2. Bouton "Optimiser la semaine" dans la toolbar
Un bouton dans la barre d'outils du planning qui :
- Appelle `optimize-week` pour la semaine affichée
- Affiche un **dialog de recommandations** avec les moves détectés (lissage charge, réassignation)
- Chaque move a un badge de risque (low/medium/high) et un bouton "Appliquer"
- Résumé en haut : gain total en minutes, nombre de moves

### 3. Panneau Paramètres IA (settings)
Un **onglet "IA" dans les DisplaySettings** (ou un drawer dédié) permettant de configurer :
- Les **poids de scoring** (6 curseurs : cohérence, équité, continuité, route, gap, proximité) - sauvegardés dans `planning_optimizer_config.weights`
- Les **contraintes dures** : niveau minimum de compétence requis, buffer entre RDV, charge max journalière
- Aperçu visuel de la pondération actuelle (radar chart simple)

### 4. Indicateur visuel "Suggestion IA" sur la carte
Sur la vue carte (map), quand on a un dossier sélectionné dans le panel non planifié :
- Afficher un marqueur spécial sur la carte pour le dossier
- Tracer les distances vers les techniciens proches disponibles
- Colorer les techs selon leur score de pertinence

## Architecture technique

```text
┌─────────────────────────────────────────────────┐
│              Planning V2 Shell                    │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │ Toolbar   │  │ Day/Week │  │ Unscheduled    │ │
│  │ + btn     │  │ views    │  │ Panel          │ │
│  │ "Optimize"│  │          │  │ + btn "Planif" │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│       │                            │              │
│       ▼                            ▼              │
│  ┌──────────┐              ┌──────────────────┐  │
│  │ Optimize │              │ AI Suggest       │  │
│  │ Dialog   │              │ Drawer           │  │
│  └──────────┘              └──────────────────┘  │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │ AI Settings (weights + constraints)          ││
│  │ → saves to planning_optimizer_config          ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/planning-v2/components/shared/AiSuggestDrawer.tsx` | **Créer** - Drawer suggestions IA pour un dossier |
| `src/planning-v2/components/shared/OptimizeWeekDialog.tsx` | **Créer** - Dialog d'optimisation semaine |
| `src/planning-v2/components/shared/AiSettingsPanel.tsx` | **Créer** - Panneau paramètres IA (poids + contraintes) |
| `src/planning-v2/components/shared/UnscheduledPanel.tsx` | **Modifier** - Ajouter bouton "Planifier" sur chaque carte |
| `src/planning-v2/components/PlanningV2Shell.tsx` | **Modifier** - Ajouter bouton "Optimiser" + drawer settings |
| `src/planning-v2/hooks/useAiPlanning.ts` | **Créer** - Hook wrapper autour de usePlanningAugmente adapté au contexte V2 |

## Ordre d'implémentation

1. Hook `useAiPlanning` (connexion aux edge functions existantes)
2. `AiSuggestDrawer` + intégration dans `UnscheduledPanel`
3. `OptimizeWeekDialog` + bouton dans la toolbar
4. `AiSettingsPanel` (paramétrage des poids)

Pas besoin de nouvelle table ni migration : `planning_optimizer_config` existe déjà avec `weights` et `hard_constraints`.

