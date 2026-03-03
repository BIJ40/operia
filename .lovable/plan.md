

## Analyse : Permissions manquantes pour Veille et Prospects

### Constat

Le module `prospection` déclare 3 sous-options dans `MODULE_DEFINITIONS` :
- `dashboard` (Suivi client)
- `comparateur` (Comparateur)
- `meetings` (RDV)

Il manque **`veille`** et **`prospects`**. Ces onglets ne sont pas enregistrés dans le système de permissions.

### Comportement actuel

Actuellement, la page `ProspectionTabContent` affiche les 4 onglets (Suivi client, Comparateur, Veille, Prospects) **sans aucune vérification d'option**. Donc :

- **Tout utilisateur ayant accès au module `prospection`** voit les 4 onglets, y compris Veille et Prospects.
- Il n'y a **aucun contrôle granulaire** : on ne peut pas activer/désactiver Veille ou Prospects individuellement dans l'admin utilisateur.
- Les N5/N6 (bypass) voient tout. Les autres voient tout dès que le module `prospection` est activé dans leur `user_modules`.

### Ce qu'il faut corriger

#### 1. Enregistrer les options manquantes dans `MODULE_DEFINITIONS`

Dans `src/types/modules.ts`, ajouter `veille` et `prospects` aux options du module `prospection` :

```typescript
prospection: {
  dashboard: 'prospection.dashboard',
  comparateur: 'prospection.comparateur',
  meetings: 'prospection.meetings',
  veille: 'prospection.veille',        // NOUVEAU
  prospects: 'prospection.prospects',   // NOUVEAU
},
```

Et dans le tableau `MODULE_DEFINITIONS`, ajouter les 2 `OptionDefinition` avec `defaultEnabled: true`.

#### 2. Ajouter les min-roles dans `constants.ts`

```typescript
'prospection.veille': 'franchisee_admin',
'prospection.prospects': 'franchisee_admin',
```

#### 3. Filtrer les onglets dans `ProspectionTabContent.tsx`

Utiliser `useAuth().hasModuleOption()` pour conditionner l'affichage de chaque onglet :

```typescript
const { hasModuleOption } = useAuth();
const visibleTabs = TABS.filter(tab => {
  const optionMap = { apporteurs: 'dashboard', comparateur: 'comparateur', veille: 'veille', prospects: 'prospects' };
  return hasModuleOption('prospection', optionMap[tab.id]);
});
```

#### 4. Mettre à jour `modulesByRole.ts`

Ajouter `veille: true, prospects: true` dans les rôles N2+ qui ont déjà `prospection` activé, pour que les utilisateurs existants ne perdent pas l'accès.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/types/modules.ts` | Ajouter options `veille` + `prospects` |
| `src/permissions/constants.ts` | Ajouter min-roles pour les 2 options |
| `src/prospection/pages/ProspectionTabContent.tsx` | Filtrer les onglets selon permissions |
| `src/config/modulesByRole.ts` | Ajouter defaults pour les rôles existants |

