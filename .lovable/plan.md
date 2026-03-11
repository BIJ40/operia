

# Plan : Fusionner Ticketing + Aide → onglet "Support"

## Structure cible

```text
Accueil | Pilotage | Commercial | Organisation | Documents | Support | Admin
```

Sous-onglets de **Support** :
1. **Aide en ligne** (ex "Support" — le composant SupportTabContent existant)
2. **Guides** (avec sous-catégories Apogée, futures...)
3. **FAQ**
4. **Ticketing** (conditionné au module `ticketing`)

## Changements

### 1. `src/components/unified/workspace/types.ts`
- `UnifiedTab` : retirer `ticketing` et `aide`, ajouter `support`
- `DEFAULT_TAB_ORDER` : remplacer `ticketing, aide` par `support`

### 2. `src/pages/UnifiedWorkspace.tsx` (L107-116)
- Supprimer les entrées `ticketing` et `aide` de `allTabs`
- Ajouter `{ id: 'support', label: 'Support', icon: Headphones, requiresOption: { module: 'aide' }, altModules: ['guides', 'ticketing'] }`

### 3. `src/components/unified/workspace/WorkspaceTabBar.tsx`
- `TAB_ACCENTS` : retirer `ticketing` et `aide`, ajouter `support: 'cyan'`

### 4. `src/components/unified/workspace/WorkspaceTabContent.tsx`
- Retirer les `TabsContent` pour `ticketing` et `aide`
- Ajouter un seul `TabsContent value="support"` chargeant le nouveau composant

### 5. `src/components/unified/tabs/AideTabContent.tsx` → Réécriture comme "SupportHubTabContent"
- Renommer le fichier conceptuellement (ou garder le même fichier, peu importe)
- Sous-onglets pill : **Aide en ligne**, **Guides**, **FAQ**, **Ticketing**
- "Aide en ligne" = `SupportTabContent` existant (lazy)
- "Guides" = `GuidesSection` existant (avec architecture multi-guides)
- "FAQ" = placeholder existant
- "Ticketing" = `TicketingTabContent` existant (lazy), filtré par `hasModule('ticketing')`

### 6. Routes — Mise à jour des redirections
- `src/routes/support.routes.tsx` : `/?tab=aide` → `/?tab=support`
- `src/routes/projects.routes.tsx` : `/?tab=ticketing` → `/?tab=support`
- `src/routes/academy.routes.tsx` : `/?tab=aide` → `/?tab=support`
- `src/types/modules.ts` : mettre à jour les `routes` dans les options de `guides`, `ticketing`, `aide`

### 7. `src/components/unified/views/FranchiseurView.tsx`
- Adapter si `ticketing` / `aide` y sont référencés séparément

## Ce qui ne change PAS
- Les `moduleKey` (`aide`, `ticketing`, `guides`) restent identiques
- Les composants internes `SupportTabContent`, `TicketingTabContent`, `GuidesSection` ne sont pas modifiés
- Aucune modification DB

