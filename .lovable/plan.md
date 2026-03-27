

## Plan : Fusionner la barre de filtres Veille avec la barre de recherche sur une seule ligne

### Modification unique : `src/prospection/pages/ApporteurListPage.tsx`

**Avant** (2 blocs séparés) :
- Ligne 1 : Pills Veille (Tous, Dormants, En baisse, Stables, En hausse)
- Ligne 2 : Barre de recherche + Sélecteur de période

**Après** (1 seul bloc flex) :
- Gauche : Barre de recherche + Sélecteur de période (inchangés)
- Droite : Pills Veille alignées à droite avec `ml-auto`

Supprimer le `<div className="flex flex-wrap gap-1.5">` dédié aux pills (lignes 394-421) et déplacer les pills à l'intérieur du `<div className="flex flex-wrap items-center gap-3">` (ligne 424), après le sélecteur de période, avec un `ml-auto` pour les pousser à droite.

Les pills garderont leur taille `size="sm"` actuelle. Sur petits écrans, le `flex-wrap` permettra le retour à la ligne naturel.

