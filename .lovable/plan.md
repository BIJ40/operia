

# Plan : Suppression des statistiques de la page Admin

## Ce qui sera supprimé

Le composant `StatsOverview` à la ligne 97 de `AdminIndex.tsx` qui affiche :
- Utilisateurs
- Contenus  
- Documents
- Tickets
- En attente
- Agences

## Modification

### Fichier : `src/pages/AdminIndex.tsx`

**Lignes à supprimer :**
- Ligne 11 : `import { StatsOverview } from '@/components/admin/overview/StatsOverview';`
- Lignes 96-97 : 
```tsx
{/* Stats Overview */}
<StatsOverview />
```

## Résultat

La page Admin affichera directement :
1. Le header (icône + titre "Administration")
2. Les onglets de navigation (Gestion, IA, Support, Données, Système)
3. Le contenu de l'onglet sélectionné

Plus de barre de statistiques entre le header et les onglets.

## Note

Le fichier `src/components/admin/overview/StatsOverview.tsx` et le hook `src/hooks/use-admin-stats.ts` ne seront pas supprimés (ils pourraient être réutilisés ailleurs), seule leur utilisation dans `AdminIndex.tsx` sera retirée.

