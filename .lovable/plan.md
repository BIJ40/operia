

# Plan : Intégrer les avatars équipe dans la génération IA

## Problème

Les avatars team sont uniquement utilisés dans le rendu canvas client (`drawBrandCard`). L'edge function `social-visual-generate` ne les connaît pas.

## Solution

Deux options, du plus simple au plus ambitieux :

### Option A — Canvas-first pour les posts équipe (rapide)

Forcer le rendu **canvas** (avec avatars) comme visuel principal pour les posts `prospection` et `calendar`, au lieu de lancer la génération IA.

- Modifier le flux de génération : si `topicType` est `prospection` ou `calendar`, utiliser le canvas `brand_card` avec `drawTeamGrid` comme visuel final
- Le canvas est exporté en PNG et stocké dans le bucket comme un visuel normal
- Avantage : les avatars apparaissent immédiatement, pas besoin de toucher l'edge function

### Option B — Injecter les avatars dans le prompt IA (plus complexe)

- Uploader les avatars dans le bucket `brand-assets`
- Dans l'edge function, quand le post est de type équipe, inclure les URLs des avatars comme images de référence dans le prompt Gemini
- Demander au modèle d'intégrer ces visages dans la scène

Problème : la fidélité des visages via prompt IA est très faible. Les résultats seront aléatoires.

### Recommandation

**Option A** — c'est plus fiable et immédiat. Les avatars illustrés sont déjà de bonne qualité, le canvas `brand_card` les affiche bien en grille avec branding HC.

## Fichiers impactés (Option A)

| Fichier | Modification |
|---|---|
| `src/hooks/useSocialVisualAssets.ts` | Ajouter une fonction `generateCanvasVisual` qui exporte le canvas en PNG et l'uploade dans le bucket |
| Composant de génération visuelle | Détecter `topicType === 'prospection' || 'calendar'` → utiliser le canvas au lieu de l'edge function |
| `drawBrandCard.ts` | Déjà prêt (drawTeamGrid existe) |

