

# Plan : Ajouter la photo d'équipe comme asset Social Hub

## Contexte

L'utilisateur fournit une photo de groupe illustrée (lui en blanc + une partie de l'équipe HelpConfort). Cette image doit être disponible comme visuel utilisable dans les publications Social Hub, notamment pour les posts "équipe" / "brand" / "prospection".

## Actions

### 1. Copier l'image dans les assets

Stocker l'image dans `src/assets/team/team-group-photo.png` aux côtés des avatars individuels existants.

### 2. Exporter dans `templateAssets.ts`

Ajouter un export `getTeamGroupPhotoSrc()` dans `src/components/commercial/social/templates/templateAssets.ts` pour rendre l'image accessible aux templates canvas.

### 3. Intégrer dans `drawBrandCard.ts`

Modifier le template `brand_card` pour utiliser cette photo de groupe comme alternative visuelle :
- Quand `showTeam` est activé (posts prospection/calendar), alterner entre la grille d'avatars individuels et cette photo de groupe
- Ou utiliser cette photo comme fond/illustration principale dans la ZONE 2 du canvas

### 4. Rendre disponible comme média dans le Social Hub

Référencer cette image dans les options de médias disponibles pour les publications, afin qu'elle puisse être sélectionnée manuellement lors de la création d'un post.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/assets/team/team-group-photo.png` | Nouveau — copie de l'image uploadée |
| `src/components/commercial/social/templates/templateAssets.ts` | Ajouter export photo de groupe |
| `src/components/commercial/social/templates/drawBrandCard.ts` | Utiliser la photo de groupe comme option de rendu |

