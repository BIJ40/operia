

# Fix: Colonne Module s'ajuste à sa largeur minimale

## Changement

Fichier `src/components/admin/views/ModulesMasterView.tsx`, ligne 291 :

**Avant** : `grid-cols-[minmax(200px,1fr)_80px_60px_80px_80px_60px_70px]`

**Après** : `grid-cols-[minmax(200px,max-content)_80px_60px_80px_80px_60px_70px]`

`1fr` → `max-content` : la colonne s'adapte au contenu au lieu de s'étirer pour remplir l'espace restant.

