

# Refonte widget "Répartition" — Grille 2×4 avec pictos univers et barres circulaires

## Constat

Oui, les 8 pictos univers sont bien en stock dans `src/assets/` :
- `picto-plomberie.png`
- `picto-electricite.png`
- `picto-serrurerie.png`
- `picto-menuiserie.png`
- `picto-vitrerie.png`
- `picto-volets.png`
- `picto-pmr.png`
- `picto-renovation.png`

Le widget actuel (`CAParUniversWidget`) affiche une liste verticale avec barres horizontales.

## Ce qui change

Remplacer le contenu du widget par une **grille 2 colonnes × 4 lignes** (8 univers max). Chaque cellule affiche :
- Le **picto** de l'univers (image ~32px) au centre
- Une **barre de progression circulaire** (SVG ring) autour du picto, remplie selon le % du CA
- Le **nom** de l'univers en dessous (texte xs)
- La **valeur** (CA ou %) en petit

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/dashboard/widgets/CAParUniversWidget.tsx` | Refonte complète du rendu : grille 2×4, pictos, progress ring SVG |

## Approche technique

1. **Mapping univers → picto** : Réutiliser le dictionnaire `UNIVERSE_PICTOS` de `templateAssets.ts` (ou importer directement les assets). Clé de matching basée sur le nom de l'univers (normalisation lowercase).

2. **Progress ring SVG** : Un cercle SVG avec `stroke-dasharray` / `stroke-dashoffset` pour animer le pourcentage. Rayon ~24px, le picto est positionné au centre en `absolute`.

3. **Layout** : `grid grid-cols-2 gap-3` pour la grille 2×4. Chaque cellule est un flex column centré.

4. **Données** : Même query StatIA qu'actuellement, on garde les 8 premiers univers triés par CA décroissant et on calcule le % par rapport au total.

```text
┌──────────┬──────────┐
│  ╭───╮   │  ╭───╮   │
│  │ 🔧│   │  │ ⚡│   │
│  ╰───╯   │  ╰───╯   │
│ Plomberie│ Électri. │
│  45%     │  22%     │
├──────────┼──────────┤
│  ╭───╮   │  ╭───╮   │
│  │ 🔑│   │  │ 🪟│   │
│  ╰───╯   │  ╰───╯   │
│ Serrure. │ Vitrerie │
│  12%     │  8%      │
├──────────┼──────────┤
│  ...     │  ...     │
└──────────┴──────────┘
```

