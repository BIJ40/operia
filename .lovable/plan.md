
# Implémentation du système de préchargement des données

## Résumé

Création d'un système de préchargement des données API Apogée au login, avec popup de progression thème "warm-blue", pour les utilisateurs ayant accès aux statistiques. L'objectif : navigation instantanée vers l'onglet Stats.

---

## Fichiers à créer

### 1. `src/contexts/DataPreloadContext.tsx`
Contexte React orchestrant tout le préchargement avec :
- Gestion des steps pondérés (users: 10, clients: 15, projects: 25, interventions: 20, factures: 20, devis: 10)
- Calcul de progression indépendant de l'ordre des appels parallèles
- Modes non-bloquant (défaut) et bloquant (erreur critique)
- Mode dégradé si erreurs non critiques
- Gestion de session versionnée (`preload:${userId}:${agencySlug}:v1`)
- Vérification TTL cache apogeeProxy (2h)

### 2. `src/components/preload/DataPreloadPopup.tsx`
Composant popup principal avec :
- Barre de progression animée warm-blue
- Liste des étapes avec statuts visuels (pending/active/done/error)
- Messages d'attente dynamiques (rotation 4-6s)
- Astuces contextualisées selon modules (rotation 8-10s)
- Bouton "Réduire" (mode non-bloquant)
- Bouton "Réessayer" (mode bloquant sur erreur)
- Animation douce fermeture/ouverture

### 3. `src/components/preload/PreloadStepsList.tsx`
Sous-composant listant les étapes avec icônes de statut :
- ⋯ Pending (gris)
- ⟳ Active (warm-blue animé)
- ✓ Done (warm-green)
- ✗ Error (warm-orange)

### 4. `src/components/preload/PreloadTipsCarousel.tsx`
Carrousel d'astuces contextuel selon les modules activés de l'utilisateur.

### 5. `src/components/preload/PreloadMinimizedIndicator.tsx`
Indicateur discret (coin écran) quand popup réduite, permettant de la rouvrir.

---

## Fichiers à modifier

### 1. `src/services/apogeeProxy.ts`
Ajouter la méthode `getAllDataWithProgress` :
```typescript
type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface StepUpdateCallback {
  (stepKey: string, status: StepStatus, error?: string): void;
}

getAllDataWithProgress: async (
  agencySlug: string,
  onStepUpdate: StepUpdateCallback,
  bypassCache?: boolean
) => Promise<AllDataResult>
```

### 2. `src/App.tsx`
- Ajouter `DataPreloadProvider` dans la hiérarchie des providers
- Ajouter `DataPreloadPopup` dans `AppContent` (après WelcomeWizardGate)

---

## Logique de déclenchement

```typescript
function shouldTriggerPreload(): boolean {
  // 1. Utilisateur authentifié ?
  if (!user || isAuthLoading) return false;
  
  // 2. A-t-il une agence ?
  const effectiveAgence = isImpersonating ? impersonatedUser.agence : agence;
  if (!effectiveAgence) return false;
  
  // 3. A-t-il accès aux stats ?
  // Vérifier: stats.stats_hub OU pilotage_agence.stats_hub (legacy)
  const hasStatsAccess = 
    hasModuleOption('stats', 'stats_hub') ||
    hasModuleOption('pilotage_agence', 'stats_hub') ||
    globalRole === 'platform_admin' ||
    globalRole === 'superadmin';
  
  if (!hasStatsAccess) return false;
  
  // 4. Déjà préchargé cette session avec ce user/agence ?
  const sessionKey = `preload:${user.id}:${effectiveAgence}:v1`;
  const sessionMeta = sessionStorage.getItem(sessionKey);
  if (sessionMeta) {
    const meta = JSON.parse(sessionMeta);
    // Vérifier TTL (2h = 7_200_000ms)
    if (Date.now() - meta.completedAt < 7_200_000) {
      return false; // Cache encore valide
    }
  }
  
  return true;
}
```

---

## Système de steps pondérés

```typescript
const PRELOAD_STEPS = [
  { key: 'users', label: 'Utilisateurs', weight: 10, critical: false },
  { key: 'clients', label: 'Clients', weight: 15, critical: false },
  { key: 'projects', label: 'Projets', weight: 25, critical: false },
  { key: 'interventions', label: 'Interventions', weight: 20, critical: false },
  { key: 'factures', label: 'Factures', weight: 20, critical: false },
  { key: 'devis', label: 'Devis', weight: 10, critical: false },
] as const;
// Total: 100

// Calcul progression:
// progress = (sum of weights where status === 'done') / 100 * 100
```

---

## Gestion du cache session

```typescript
interface PreloadSessionMeta {
  completedAt: number;         // Timestamp fin
  agencySlug: string;          // Agence
  userId: string;              // User
  version: 'v1';               // Version schéma
  stepResults: Record<string, 'done' | 'error'>;
}

// Clé: preload:${userId}:${agencySlug}:v1
// Stockage: sessionStorage (survit au refresh, pas au close tab)
```

---

## Messages et astuces

### Messages d'attente (rotation 4-6s)
```typescript
const LOADING_MESSAGES = [
  "Préparation de votre espace...",
  "Synchronisation en cours...",
  "Chargement de vos données...",
  "Mise à jour des informations...",
  "Optimisation de l'affichage...",
];
```

### Astuces par module (rotation 8-10s)
```typescript
const TIPS = {
  stats: [
    "💡 Consultez le CA par technicien depuis l'onglet Stats",
    "📊 Filtrez les données par période pour affiner l'analyse",
  ],
  pilotage_agence: [
    "🎯 Les indicateurs clés sont visibles sur le tableau de bord",
    "📈 Suivez l'évolution du CA mensuel en temps réel",
  ],
  // ...
};
```

---

## Modes d'affichage

### Mode non-bloquant (défaut)
- Overlay semi-transparent
- Bouton "Réduire" visible
- Navigation possible en arrière-plan

### Mode bloquant (erreur critique)
- Dialog modal sans fermeture
- Bouton "Réessayer" uniquement
- Message d'erreur clair

### Mode dégradé
- App utilisable
- Badge "Données partielles" affiché
- Stats peuvent être incomplètes

---

## Throttling UI

```typescript
// Limiter les updates UI à 10/s max
const throttledSetProgress = useMemo(
  () => throttle((value: number) => setProgress(value), 100),
  []
);
```

---

## Intégration App.tsx

```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ImpersonationProvider>
              <DataPreloadProvider>  {/* ← Nouveau */}
                <EditorProvider>
                  <ApporteurEditorProvider>
                    <GlobalErrorBoundary>
                      <AppContent />
                    </GlobalErrorBoundary>
                    <Toaster />
                    <Sonner />
                  </ApporteurEditorProvider>
                </EditorProvider>
              </DataPreloadProvider>
            </ImpersonationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

---

## Séquence détaillée

| # | Action | Progression |
|---|--------|-------------|
| 1 | Login détecté + conditions OK | 0% |
| 2 | Popup apparaît | 0% |
| 3 | 6 appels API lancés en parallèle | 0% |
| 4 | Premier terminé (ex: users) | 10% |
| 5 | Deuxième terminé (ex: devis) | 20% |
| 6 | ... | ... |
| 7 | Tous terminés | 100% |
| 8 | Animation fermeture | ✓ |
| 9 | Session meta sauvegardée | - |

---

## Section technique

### Dépendances utilisées
- `@radix-ui/react-dialog` (existant)
- `@radix-ui/react-progress` (existant)
- `framer-motion` (existant) pour animations
- `sessionStorage` pour meta de session

### Hooks créés
- `useDataPreload()` - Accès au contexte
- Pas de nouveaux hooks externes nécessaires

### Performance
- Throttling 100ms sur updates progression
- `requestAnimationFrame` pour animations barre
- Sémaphore existant (15 req max) gère la parallélisation

### Invalidation cache
- Changement agence (impersonation) → clear cache + clear session meta
- Déconnexion → session meta effacée automatiquement (sessionStorage)

---

## Tests prévus

| Scénario | Comportement attendu |
|----------|---------------------|
| Utilisateur N2 Pro avec stats | Popup affichée, progression fluide |
| Utilisateur N1 sans stats | Pas de popup |
| Utilisateur sans agence | Pas de popup |
| Refresh après preload | Pas de popup (session meta OK) |
| Attendre 2h+ puis refresh | Popup réapparaît (TTL expiré) |
| Impersonation autre agence | Nouveau préchargement |
| Erreur réseau | Mode bloquant + Réessayer |
| Erreur non critique (1 endpoint) | Mode dégradé, app utilisable |
| Clic "Réduire" | Popup minimisée, indicateur affiché |
