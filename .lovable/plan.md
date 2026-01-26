
## Correction : Graphique "Évolution du CA par Technicien" bloqué en chargement

### Problème identifié
Le composant `SlideCATechniciens` appelle `apogeeProxy.getProjects()`, `.getInterventions()`, `.getFactures()`, `.getUsers()` **sans passer `agencySlug`**, alors que ce paramètre est **obligatoire** (ligne 296-298 de `apogeeProxy.ts` : `throw new Error('agencySlug is required')`).

Cela provoque une erreur silencieuse qui laisse le composant en état de chargement infini.

### Comparaison avec les autres slides

| Slide | Source données | Agence passée |
|-------|---------------|---------------|
| SlideApporteursSAV | DataService.loadAllData | ✅ `agence` |
| SlideSegmentation | DataService.loadAllData | ✅ `agence` |
| SlideUniversApporteurs | DataService.loadAllData | ✅ `agence` |
| **SlideCATechniciens** | **apogeeProxy** | ❌ **Manquant** |

### Solution
Modifier `SlideCATechniciens` pour utiliser `useAuth()` et passer l'agence au proxy, ou mieux, utiliser `DataService.loadAllData()` comme les autres slides pour cohérence.

### Modifications

**Fichier : `src/components/diffusion/slides/SlideCATechniciens.tsx`**

```typescript
// AVANT (lignes 14-28)
export const SlideCATechniciens = ({ currentMonthIndex }: SlideCATechniciensProps) => {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['apogee-data-techniciens'],
    queryFn: async () => {
      const [projects, interventions, factures, users] = await Promise.all([
        apogeeProxy.getProjects(),       // ❌ Pas d'agencySlug
        apogeeProxy.getInterventions(),  // ❌ Pas d'agencySlug
        apogeeProxy.getFactures(),       // ❌ Pas d'agencySlug
        apogeeProxy.getUsers(),          // ❌ Pas d'agencySlug
      ]);
      return { projects, interventions, factures, users };
    },
    staleTime: 5 * 60 * 1000,
  });

// APRÈS
import { useAuth } from '@/contexts/AuthContext';
import { DataService } from '@/apogee-connect/services/dataService';

export const SlideCATechniciens = ({ currentMonthIndex }: SlideCATechniciensProps) => {
  const { agence } = useAuth();
  
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['diffusion-ca-techniciens', agence, currentMonthIndex],
    queryFn: async () => await DataService.loadAllData(true, false, agence),
    enabled: !!agence,  // ✅ N'execute que si agence est définie
    staleTime: 5 * 60 * 1000,
  });
```

### Détails des changements

1. **Ajouter l'import `useAuth`** pour récupérer l'agence de l'utilisateur connecté
2. **Remplacer `apogeeProxy` par `DataService.loadAllData`** pour cohérence avec les autres slides
3. **Ajouter `enabled: !!agence`** pour éviter l'appel si l'agence n'est pas encore disponible
4. **Mettre à jour la queryKey** avec l'agence pour invalidation correcte du cache

### Section technique

**Pourquoi `DataService` plutôt que `apogeeProxy` ?**
- `DataService.loadAllData()` gère déjà le cache, la déduplication et le chargement groupé
- Les 3 autres slides l'utilisent déjà, assurant la cohérence du cache
- Évite 4 appels réseau distincts au profit d'un seul chargement centralisé

**Impact sur les performances**
- Les données étant partagées entre tous les slides Diffusion, le premier slide chargé remplit le cache
- Les slides suivants bénéficient du cache sans requête réseau supplémentaire
