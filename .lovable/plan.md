
# Diagnostic : Gestion des Apporteurs et Erreurs d'Accès API

## Problème Identifié

Quand un utilisateur apporteur se connecte, il voit brièvement les erreurs `proxy-apogee` et `get-rdv-map` **avant** d'être redirigé vers `/apporteur/dashboard`. Ces erreurs proviennent de composants globaux qui tentent de charger des données Apogée.

### Analyse Technique du Flow Actuel

```text
┌──────────────────────────────────────────────────────────────────┐
│  1. Connexion utilisateur apporteur                              │
│     email@contact.fre → user_id: 17ab234e...                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. App.tsx charge AuthProvider                                  │
│     → useAuth() cherche profil dans `profiles` table            │
│     → profil.agence = NULL (pas de champ agence pour apporteur) │
│     → profil.global_role = NULL                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. AuthRouter vérifie si c'est un apporteur                     │
│     → useApporteurCheck() requête apporteur_users                │
│     → Pendant ce temps (async), les composants enfants se chargent │
└──────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │ Parallèle (race condition)         │
            ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│  UnifiedWorkspace se charge    │   │  AuthRouter finit la vérif    │
│  → AgencyProvider démarre      │   │  → isApporteur = true         │
│  → Appels proxy-apogee/rdv-map │   │  → Redirect vers /apporteur   │
│  → ÉCHEC: pas d'agence         │   │                               │
│  → Affiche erreurs 400/403     │   │                               │
└───────────────────────────────┘   └───────────────────────────────┘
```

### Données Actuelles de l'Apporteur Test

| Table | Champ | Valeur |
|-------|-------|--------|
| `apporteur_users` | user_id | 17ab234e-ab24-41d7-b998-2077e2f1899c |
| `apporteur_users` | agency_id | 58d8d39f... (→ `dax`) |
| `apporteur_users` | is_active | true |
| `apporteurs` | apogee_client_id | **NULL** (non raccordé) |
| `profiles` | agence | **NULL** |
| `profiles` | global_role | **NULL** |

**Double problème** :
1. L'apporteur n'a pas de profil "interne" avec agence → les Edge Functions `proxy-apogee` échouent
2. L'organisation apporteur n'est pas raccordée à Apogée (`apogee_client_id = null`) → les Edge Functions apporteur retournent `non_raccorde`

---

## Solution Proposée

### Phase 1 : Bloquer le Chargement des Composants Internes pour les Apporteurs

Modifier `AuthRouter` pour ne **jamais** rendre les enfants (composants internes) tant que la vérification apporteur n'est pas terminée.

**Changement clé** : Afficher un loader jusqu'à ce que la redirection soit effective.

```typescript
// AuthRouter.tsx - Version corrigée
export function AuthRouter({ children }: AuthRouterProps) {
  const { user, isAuthLoading } = useAuth();
  const { isApporteur, isLoading: isApporteurLoading } = useApporteurCheck();
  const location = useLocation();

  // Routes /apporteur/* passent directement
  if (location.pathname.startsWith('/apporteur')) {
    return <>{children}</>;
  }

  // Routes publiques passent sans vérification
  const publicPaths = ['/401', '/403', '/500', '/qr/', '/login', '/signup', '/reset-password'];
  if (publicPaths.some(path => location.pathname.startsWith(path))) {
    return <>{children}</>;
  }

  // CRITIQUE: Afficher loader TANT QUE la vérification apporteur n'est pas terminée
  // Cela empêche UnifiedWorkspace de se charger
  if (isAuthLoading || (user && isApporteurLoading)) {
    return <FullPageLoader />;
  }

  // Redirection apporteur
  if (user && isApporteur) {
    return <Navigate to="/apporteur/dashboard" replace />;
  }

  // Utilisateur interne → rendre les enfants
  return <>{children}</>;
}
```

### Phase 2 : Renforcer les Edge Functions pour les Apporteurs

Les Edge Functions `proxy-apogee` et `get-rdv-map` ont déjà la logique pour les apporteurs, mais elle ne fonctionne pas correctement. Il faut s'assurer que :

1. Si l'utilisateur est détecté comme apporteur, on utilise son `agency_id` (pas le profil interne)
2. Si l'apporteur n'a pas d'`apogee_client_id`, on retourne une erreur gracieuse (pas 400)

**Modifications `proxy-apogee`** :

```typescript
// Vérification apporteur AVANT de chercher le profil interne
const { data: apporteurUser } = await supabase
  .from('apporteur_users')
  .select('agency_id, apporteur_id, is_active')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .maybeSingle();

const isApporteurUser = !!apporteurUser;

// Si apporteur, utiliser son agence
if (isApporteurUser && apporteurUser.agency_id) {
  const { data: agency } = await supabase
    .from('apogee_agencies')
    .select('slug')
    .eq('id', apporteurUser.agency_id)
    .single();
  
  if (agency?.slug) {
    targetAgency = agency.slug;
  }
}

// Ne pas échouer si pas de profil interne pour un apporteur
if (!targetAgency && !isApporteurUser) {
  return error("Aucune agence configurée");
}
```

### Phase 3 : Améliorer l'Onboarding Apporteur

Quand un apporteur se connecte mais que son organisation n'est pas encore raccordée à Apogée (`apogee_client_id = null`), afficher un message clair dans le dashboard apporteur au lieu d'erreurs techniques.

Le code actuel le fait déjà partiellement :
```tsx
// ApporteurDashboard.tsx
if (data?.error === 'non_raccorde') {
  return <Card>Compte non raccordé à Apogée. Contactez l'agence pour activer.</Card>;
}
```

---

## Résumé des Modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/auth/AuthRouter.tsx` | Renforcer le blocking loader pour éviter race condition |
| `supabase/functions/proxy-apogee/index.ts` | Déjà OK, vérifier le flow apporteur |
| `supabase/functions/get-rdv-map/index.ts` | Déjà OK, vérifier le flow apporteur |

---

## Section Technique : Pourquoi les Erreurs Apparaissent

Le flow actuel a une **race condition** :

1. `AuthRouter` utilise `useApporteurCheck()` qui fait une requête async
2. Pendant cette requête, React rend les enfants (`children`)
3. `UnifiedWorkspace` est rendu, qui wrapper `AgencyProvider`
4. `AgencyProvider` appelle `proxy-apogee` et `get-rdv-map`
5. Ces appels échouent car l'utilisateur n'a pas de profil interne avec agence

**Solution** : Modifier `AuthRouter` pour ne PAS rendre les enfants tant que `isApporteurLoading` est `true`.

Le code actuel fait déjà cela, mais il semble que le loader ne bloque pas correctement le rendu. Il faut vérifier que le composant `FullPageLoader` est bien rendu **à la place** des enfants, pas en plus.

---

## Prochaines Étapes

1. **Immédiat** : Corriger le flow de `AuthRouter` pour bloquer le rendu des composants internes
2. **Court terme** : Raccorder l'apporteur test à Apogée (définir `apogee_client_id` dans la table `apporteurs`)
3. **Moyen terme** : Créer un wizard d'onboarding apporteur pour guider le raccordement
