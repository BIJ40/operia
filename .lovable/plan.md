

## Probleme

Le panneau dépliable des agences ne fonctionne pas parce que le contenu expansé est rendu **en dehors et après** la grille de cartes (ligne 488 de `AdminAgencies.tsx`). Quand vous cliquez le chevron, l'état change bien en interne, mais le panneau apparait tout en bas de la page, après toutes les cartes — invisible sans scroller.

```text
┌─────────────────────────────────┐
│  Grille 4 colonnes (cartes)     │  ← Visible
│  [Card1] [Card2] [Card3] [Card4]│
│  [Card5] [Card6] [Card7] [Card8]│
│  ...                            │
└─────────────────────────────────┘
  ← Panneau expansé ici, hors vue
  [Expanded Card3 details]
```

## Solution

Restructurer le rendu pour que le panneau dépliable apparaisse **directement sous la carte cliquée**, en prenant toute la largeur de la grille. Cela implique de remplacer le pattern actuel (grille + liste séparée) par un rendu en boucle où chaque carte est suivie de son panneau expansé si ouvert, en utilisant CSS `col-span-full` pour que le panneau occupe toute la largeur.

## Changements

**Fichier unique** : `src/pages/AdminAgencies.tsx`

1. Supprimer le bloc séparé de rendu des panneaux expansés (lignes 488-557) qui est en dehors de la grille
2. Dans la boucle `.map()` de la grille (ligne 411), après chaque carte, injecter conditionnellement le panneau expansé avec `className="col-span-full"` quand `expandedAgencies.has(agency.id)`
3. Le panneau contient les membres + `AgencyModuleOptions` comme actuellement

```text
┌─────────────────────────────────┐
│  [Card1] [Card2] [Card3] [Card4]│
│  ┌─── Panneau Card2 (full) ──┐  │  ← Apparait ici
│  │ Membres + Options modules │  │
│  └───────────────────────────┘  │
│  [Card5] [Card6] [Card7] [Card8]│
└─────────────────────────────────┘
```

Le code de chaque carte retournera un `Fragment` contenant la carte + le panneau conditionnel, le tout restant dans le flux naturel de la grille CSS.

