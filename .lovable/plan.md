

## Correction : Filtrage des tuiles /hc-agency par permissions

### Probleme identifie
Les tuiles sur `/hc-agency` sont affichees a tous les utilisateurs ayant le module `pilotage_agence`, mais certaines fonctionnalites necessitent des **options specifiques** du module. Actuellement, un utilisateur voit la tuile "Carte RDV" mais obtient une erreur "Acces refuse" au clic car l'option `carte_rdv` n'est pas activee dans son plan.

### Solution
Utiliser le hook `useEffectiveModules` pour filtrer les tuiles selon les permissions reelles de l'utilisateur. Chaque tuile sera associee a son option requise et masquee si l'utilisateur n'y a pas acces.

### Modifications

**Fichier : `src/pages/PilotageIndex.tsx`**

1. **Ajouter le mapping des options requises** dans la definition des modules :

```typescript
interface PilotageModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  requiredOption?: string; // NOUVEAU
}

const pilotageModules: PilotageModule[] = [
  {
    id: 'stats_hub',
    title: 'Stats Hub',
    description: 'Centre statistiques unifie de l\'agence',
    icon: BarChart3,
    href: ROUTES.agency.statsHub,
    requiredOption: 'stats_hub',
  },
  {
    id: 'carte_rdv',
    title: 'Carte RDV',
    description: 'Visualisation geographique des RDV du jour',
    icon: MapPin,
    href: ROUTES.agency.map,
    requiredOption: 'carte_rdv',
  },
  {
    id: 'diffusion',
    title: 'Diffusion',
    description: 'Mode TV agence avec statistiques',
    icon: Tv,
    href: ROUTES.agency.diffusion,
    requiredOption: 'diffusion',
  },
  {
    id: 'actions',
    title: 'Actions a mener',
    description: 'Suivi des actions et taches en cours',
    icon: ListTodo,
    href: ROUTES.agency.actions,
    requiredOption: 'actions_a_mener',
  },
  {
    id: 'mes_apporteurs',
    title: 'Mes Apporteurs',
    description: 'Creer un espace apporteur',
    icon: Building2,
    href: ROUTES.agency.mesApporteurs,
    requiredOption: 'mes_apporteurs',
  },
];
```

2. **Importer et utiliser le hook de permissions** :

```typescript
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';

export default function PilotageIndex() {
  const { globalRole } = useAuth();
  const { hasModuleOption, isLoading } = useEffectiveModules();
  
  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  // Filtrer les modules selon les permissions
  const visibleModules = pilotageModules.filter(module => {
    // Admins voient tout
    if (isPlatformAdmin) return true;
    // Si pas d'option requise, afficher
    if (!module.requiredOption) return true;
    // Verifier l'option
    return hasModuleOption('pilotage_agence', module.requiredOption);
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* ... header ... */}
      
      {/* Tuiles principales - filtrees */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleModules.map(module => (
          <PilotageTileCard
            key={module.id}
            module={module}
            badge={module.badge}
            isAdmin={isPlatformAdmin}
          />
        ))}
      </div>
      
      {/* ... reste ... */}
    </div>
  );
}
```

### Comportement attendu

| Utilisateur | Tuiles visibles |
|-------------|-----------------|
| Admin (N5+) | Toutes les tuiles |
| Franchisé plan Pro (toutes options) | Toutes les tuiles |
| Franchisé plan Basique | Uniquement les tuiles dont les options sont activees |

### Section technique

- **Hook utilise** : `useEffectiveModules` qui appelle `get_user_effective_modules` RPC
- **Bypass N5+** : Deja gere dans `hasModuleOption()` 
- **Performance** : Le hook a un `staleTime` de 5 minutes, donc pas de requetes superflues

