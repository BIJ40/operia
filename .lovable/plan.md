
# Plan : Routage Automatique des Utilisateurs Apporteurs

## Problème Identifié

Actuellement, quand un utilisateur apporteur se connecte avec ses identifiants :
1. Le système charge son profil via `AuthContext`
2. Il a `global_role = null` dans `profiles` (ou n'a pas de profil du tout)
3. Il est traité comme un utilisateur N0 et affiché sur l'interface interne (`/` = UnifiedWorkspace avec le dashboard de démo)
4. L'espace apporteur dédié (`/apporteur/*`) existe mais n'est jamais atteint automatiquement

**Données actuelles** : L'utilisateur `email@contact.fre` (user_id: `17ab234e-ab24-41d7-b998-2077e2f1899c`) est dans `apporteur_users` avec `role: manager`, mais son profil n'a pas de `global_role` spécifique qui le distinguerait.

## Solution Proposée

### Architecture à 2 Niveaux

```
┌─────────────────────────────────────────────────────────────┐
│                    Connexion Supabase Auth                   │
│                         (email/password)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AuthRouter (NOUVEAU)                      │
│  Vérifie si user_id existe dans apporteur_users             │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │ OUI = Apporteur      │    │ NON = Utilisateur interne │   │
│  │ Redirect /apporteur  │    │ Charge profil + modules    │   │
│  └──────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐         ┌───────────────────────────┐
│   Espace Apporteur    │         │  Espace Interne (actuel)  │
│   /apporteur/*        │         │  / (UnifiedWorkspace)     │
│   Layout dédié        │         │  N0-N6 standard           │
└───────────────────────┘         └───────────────────────────┘
```

### Implémentation Technique

#### 1. Nouveau Hook `useApporteurCheck` 

Créer un hook léger qui vérifie si l'utilisateur authentifié est un apporteur :

```typescript
// src/hooks/useApporteurCheck.ts
export function useApporteurCheck() {
  const { user } = useAuth();
  
  const { data: isApporteur, isLoading } = useQuery({
    queryKey: ['is-apporteur', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('apporteur_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Ne change pas pendant la session
  });

  return { isApporteur: isApporteur ?? false, isLoading };
}
```

#### 2. Composant `AuthRouter` (Point d'Entrée Global)

Créer un composant qui intercepte le routage après authentification :

```typescript
// src/components/auth/AuthRouter.tsx
export function AuthRouter({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuth();
  const { isApporteur, isLoading: isApporteurLoading } = useApporteurCheck();
  const location = useLocation();

  // Toujours autoriser les routes /apporteur (gérées par leur propre auth)
  if (location.pathname.startsWith('/apporteur')) {
    return <>{children}</>;
  }

  // Chargement
  if (isAuthLoading || (user && isApporteurLoading)) {
    return <FullPageLoader />;
  }

  // Utilisateur apporteur sur route interne → redirection automatique
  if (user && isApporteur && !location.pathname.startsWith('/apporteur')) {
    return <Navigate to="/apporteur/dashboard" replace />;
  }

  // Utilisateur interne ou non connecté → flux normal
  return <>{children}</>;
}
```

#### 3. Intégration dans App.tsx

Wrapper l'ensemble des routes avec `AuthRouter` :

```tsx
// Dans App.tsx
function AppContent() {
  return (
    <AuthRouter>
      <Routes>
        {/* Toutes les routes existantes */}
      </Routes>
    </AuthRouter>
  );
}
```

### Comportement Final

| Utilisateur | Route accédée | Comportement |
|-------------|---------------|--------------|
| Apporteur connecté | `/` | Redirect → `/apporteur/dashboard` |
| Apporteur connecté | `/profile` | Redirect → `/apporteur/dashboard` |
| Apporteur connecté | `/apporteur/*` | Accès normal (layout apporteur) |
| Interne N0-N6 | `/` | Accès normal (UnifiedWorkspace) |
| Interne N0-N6 | `/apporteur/*` | Landing apporteur (pas auth apporteur) |
| Non connecté | `/` | Login interne |
| Non connecté | `/apporteur` | Landing apporteur + login |

### Fichiers à Créer/Modifier

1. **`src/hooks/useApporteurCheck.ts`** (NOUVEAU)
   - Hook simple qui vérifie si `user_id` existe dans `apporteur_users`

2. **`src/components/auth/AuthRouter.tsx`** (NOUVEAU)
   - Composant wrapper qui redirige les apporteurs vers leur espace dédié

3. **`src/App.tsx`**
   - Wrapper les routes avec `AuthRouter`

4. **`src/contexts/AuthContext.tsx`** (optionnel)
   - Ajouter un flag `isApporteurUser` directement dans le contexte pour éviter une requête supplémentaire

### Alternative : Détection dans AuthContext

Pour éviter une requête supplémentaire, on peut intégrer la vérification directement dans `loadUserData()` :

```typescript
// Dans AuthContext.tsx, loadUserData()
const { data: apporteurEntry } = await supabase
  .from('apporteur_users')
  .select('id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .maybeSingle();

setIsApporteurUser(!!apporteurEntry);
```

Puis exposer `isApporteurUser` dans le contexte et l'utiliser dans `AuthRouter`.

### Sécurité

- Les routes `/apporteur/*` conservent leur propre `ApporteurGuard` qui vérifie les permissions apporteur
- Un utilisateur interne qui tente d'accéder à `/apporteur/*` verra la landing page apporteur (pas d'accès aux données)
- Un apporteur ne peut pas accéder à l'interface interne (redirection automatique)
- Les données sont isolées via RLS sur `apporteur_id`

### Avantages

1. **Expériences séparées** : Interface complètement différente pour les apporteurs
2. **Zéro friction** : Redirection automatique sans action utilisateur
3. **Sécurité** : Impossible pour un apporteur d'accéder aux données internes
4. **Scalabilité** : Chaque franchisé peut créer ses apporteurs sans impacter le système interne
5. **Maintenance** : Les deux espaces évoluent indépendamment
