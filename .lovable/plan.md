

# Titres modules en majuscule + couleurs par niveau de profondeur

## Changements dans `ModulesMasterView.tsx`

### 1. Titres modules (depth 0) en MAJUSCULE
Ligne 329-331 : ajouter `uppercase` à la classe du span pour `depth === 0`, et appliquer `node.label` tel quel (le CSS `uppercase` gère l'affichage).

### 2. Couleurs distinctes par profondeur
Modifier les styles du nom selon le depth :
- **depth 0** (Module) : couleur primaire, `font-semibold uppercase` (déjà en place, juste ajouter `uppercase` + couleur)
- **depth 1** (Section/sous-module) : couleur bleue distincte, ex `text-blue-600 dark:text-blue-400`
- **depth 2** (Outil) : couleur violette, ex `text-violet-600 dark:text-violet-400`

Concrètement, ligne 329 :
```tsx
<span className={cn(
  'truncate',
  node.depth === 0 && 'font-semibold text-foreground uppercase tracking-wide',
  node.depth === 1 && 'font-medium text-blue-600 dark:text-blue-400',
  node.depth >= 2 && 'text-violet-600 dark:text-violet-400'
)}>
```

Optionnel : ajouter un léger `bg` de fond sur les lignes depth 1 pour renforcer la distinction visuelle (ex: `bg-blue-50/30 dark:bg-blue-950/20`).

