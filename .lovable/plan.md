

## Fix: Popover des tags ne se ferme pas au premier clic extérieur

### Cause racine

Le wrapper du contenu du popover (ligne 67) a un `onPointerDown={(e) => e.stopPropagation()}` global. Cela empêche parfois Radix de détecter correctement le clic extérieur via son "dismiss layer", nécessitant un second clic.

Le `onClick={(e) => e.stopPropagation()}` (ligne 66) pose le même problème potentiel.

### Solution

Supprimer les `stopPropagation` globaux sur le wrapper du popoverContent. Les `stopPropagation` individuels sur les boutons de suppression de tags (croix "X") et les boutons de toggle suffisent déjà à empêcher les conflits avec les lignes du tableau parent.

### Fichier modifié
- `src/apogee-tickets/components/TagSelector.tsx` — Retirer `onClick` et `onPointerDown` avec `stopPropagation` du div wrapper du popoverContent (lignes 66-67).

