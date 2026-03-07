

# Ajouter la colonne "Privilèges" (user overrides) au registre des modules + Renommer en "Droits"

## Objectif

Centraliser **toute** la gestion des droits dans un seul écran. On ajoute une 7e colonne "Privilèges" permettant d'attribuer des utilisateurs en override sur chaque ligne du registre. Un utilisateur assigné ici **outrepasse** toutes les autres restrictions (plan, rôle, déploiement). L'onglet "Modules" sous Gestion est renommé "Droits".

## Architecture

La table `user_modules` existe déjà (user_id, module_key, options). C'est exactement la table d'overrides. Pas besoin de nouvelle table — on la réutilise.

### Ce qui change

**UI — ModulesMasterView.tsx** :
- 7e colonne "Privilèges" avec un badge compteur ("3 users" ou "—")
- Clic → Popover/Dialog avec :
  - Liste des utilisateurs déjà assignés (avec bouton ✕ pour retirer)
  - Combobox de recherche pour en ajouter (query `profiles` avec search)
- Grid passe à `grid-cols-[minmax(200px,1fr)_80px_60px_80px_80px_60px_90px]`

**Hooks** :
- Nouveau hook `useModuleOverrides()` : charge tous les `user_modules` groupés par `module_key`, retourne un `Map<string, UserOverride[]>`
- Mutations : `addOverride(userId, moduleKey)` → upsert dans `user_modules`, `removeOverride(userId, moduleKey)` → delete

**Renommage** :
- `AdminHubContent.tsx` : label "Modules" → "Droits", icon Crown → Shield
- `PlateformeView.tsx` : le sous-onglet "Modules" sous Plateforme reste (c'est le registre technique), distinct de "Droits" sous Gestion
- Title et description dans ModulesMasterView : "Registre des Modules" → "Gestion des Droits"

**RPC `get_user_effective_modules`** : déjà OK — les `user_overrides` CTE prend le dessus sur les restrictions plan/role. Aucune modification SQL nécessaire.

**Cleanup optionnel** : `UserModulesTab.tsx` (fiche utilisateur) pourrait afficher un badge "Géré depuis Droits" en lecture seule, pointant vers l'écran centralisé.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/admin/views/ModulesMasterView.tsx` | Ajouter 7e colonne + popover user overrides |
| `src/hooks/access-rights/useModuleOverrides.ts` | **Nouveau** — CRUD user_modules groupé par module_key |
| `src/components/unified/tabs/AdminHubContent.tsx` | Renommer onglet "Modules" → "Droits", icon Shield |
| `src/components/admin/views/ModulesMasterView.tsx` | Titre "Gestion des Droits" |

## Détails techniques

### Hook `useModuleOverrides`

```typescript
// Charge TOUS les user_modules avec profil (nom, email)
// Retourne Map<module_key, { userId, firstName, lastName, email }[]>
// + mutations addOverride / removeOverride
```

Query : `user_modules` JOIN `profiles` (via user_id) pour afficher nom/email.

### Composant OverridesPopover

- Badge compteur cliquable : `"3"` ou `"—"` si aucun
- Popover avec :
  - ScrollArea des users assignés (avatar mini + nom + bouton ✕)
  - Separator
  - Combobox recherche (`profiles` filtrés, debounced)
  - Click sur un résultat → `addOverride` mutation
- Le badge est coloré si des overrides existent (orange/amber pour signaler une exception)

### Performance

Avec 10 users en DB, pas de souci. La query `user_modules` + `profiles` est légère. On charge tout d'un coup au mount du composant, pas par ligne.

