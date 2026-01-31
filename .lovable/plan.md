
# Plan : Ajout onglet Performance Terrain dans Outils

## 1. Modification cible

**Fichier** : `src/components/unified/tabs/DiversTabContent.tsx`

## 2. Changements à effectuer

### 2.1 Import du composant
```typescript
const PerformanceDashboard = lazy(() => 
  import('@/components/performance/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard }))
);
```

### 2.2 Ajouter le type
```typescript
type OutilsMainTab = 'actions' | 'apporteurs' | 'administratif' | 'parc' | 'performance';
```

### 2.3 Ajouter dans MAIN_TABS
```typescript
const MAIN_TABS: PillTabConfig[] = [
  { id: 'actions', label: 'Actions', icon: Settings, accent: 'blue' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Users, accent: 'purple' },
  { id: 'administratif', label: 'Administratif', icon: FolderOpen, accent: 'orange' },
  { id: 'parc', label: 'Parc', icon: Car, accent: 'green' },
  { id: 'performance', label: 'Performance', icon: Activity, accent: 'pink' }, // NOUVEAU
];
```

### 2.4 Ajouter le TabsContent
```tsx
<TabsContent value="performance" className="mt-6 animate-fade-in">
  <Suspense fallback={<LoadingFallback />}>
    <PerformanceDashboard />
  </Suspense>
</TabsContent>
```

## 3. Résultat attendu

| Position | Onglet | Icône | Couleur |
|----------|--------|-------|---------|
| 1 | Actions | Settings | Blue |
| 2 | Apporteurs | Users | Purple |
| 3 | Administratif | FolderOpen | Orange |
| 4 | Parc | Car | Green |
| **5** | **Performance** | **Activity** | **Pink** |

## 4. Impact
- Aucune modification de routing nécessaire
- Le module Performance Terrain sera accessible via `/?tab=outils` puis clic sur "Performance"
- Persistance de l'onglet actif via `useSessionState`
