
# Plan de correction : Page de gestion des utilisateurs

## Problèmes identifiés

### 1. Mauvais composant affiché
La capture d'écran montre la page **"Gestion des Permissions"** (composant `UnifiedManagementPage`) au lieu de **"Gestion Utilisateurs Réseau"** (composant `TDRUsersPage`).

Bien que la route `/admin/gestion` soit correctement configurée pour utiliser `TDRUsersPage`, il semble que l'ancienne page soit toujours affichée (possible problème de cache ou de déploiement).

### 2. Colonne Agence affiche des UUIDs
Dans `UnifiedManagementPage.tsx`, ligne 122-123 :
```typescript
{user.agency_id ? (
  <span className="text-sm">{user.agency_id}</span>  // ❌ Affiche l'UUID
) : (
```
Devrait afficher le **label lisible** de l'agence, pas l'UUID.

### 3. Bouton "Nouvel utilisateur" manquant
Le composant `UnifiedManagementPage` n'a pas d'interface pour créer des utilisateurs, contrairement à `TDRUsersPage` qui l'a.

---

## Plan de correction

### Étape 1 : Corriger `UnifiedManagementPage.tsx` (backup/fallback)
Même si cette page ne devrait plus être utilisée pour `/admin/gestion`, je vais la corriger pour qu'elle soit fonctionnelle au cas où :

**Modifications :**
1. Afficher `user.agency?.label` au lieu de `user.agency_id`
2. Ajouter le bouton "Nouvel utilisateur" avec les droits appropriés
3. Ajouter les actions (édition, désactivation, etc.) via le hook `useAccessRightsUsers` existant

### Étape 2 : Vérifier la cohérence du hook `useAccessRightsUsers`
Le hook récupère déjà les agences avec leurs labels via la jointure :
```typescript
agency:apogee_agencies(id, label, slug)
```
Et résout les agences par slug si `agency_id` est null.

### Étape 3 : S'assurer que `TDRUsersPage` affiche le label d'agence
Vérifier que le composant `UserAccordionItem` affiche le label d'agence lisible et non le slug brut.

---

## Détails techniques

### Fichier : `src/pages/admin/UnifiedManagementPage.tsx`

**Correction de l'affichage de l'agence :**
```typescript
// AVANT (ligne 121-127)
<TableCell>
  {user.agency_id ? (
    <span className="text-sm">{user.agency_id}</span>
  ) : (
    <span className="text-muted-foreground text-sm">—</span>
  )}
</TableCell>

// APRÈS
<TableCell>
  {user.agency?.label ? (
    <span className="text-sm">{user.agency.label}</span>
  ) : user.agence ? (
    <span className="text-sm text-muted-foreground">{user.agence}</span>
  ) : (
    <span className="text-muted-foreground text-sm">—</span>
  )}
</TableCell>
```

**Ajout du bouton "Nouvel utilisateur" et des actions :**
- Utiliser le hook complet `useAccessRightsUsers` au lieu d'une version simplifiée
- Ajouter les dialogs de création/édition/désactivation
- Ajouter les dropdowns d'actions par utilisateur

### Fichier : `src/components/admin/users/UserAccordionItem.tsx`

**Correction de l'affichage de l'agence (ligne 126-128) :**
La valeur `user.agence` est un slug (ex: "dax"). Il faut afficher le label lisible.

**Option 1 :** Passer les agences en props et faire une lookup
**Option 2 :** Enrichir les données utilisateur avec le label d'agence dans le hook

Je recommande l'Option 2 car elle centralise la logique dans le hook.

### Fichier : `src/hooks/use-user-management.ts`

**Enrichir les utilisateurs avec le label d'agence :**
```typescript
// Dans la query users (ligne ~190), ajouter une jointure ou post-traitement
// pour résoudre agence slug → label
```

---

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/UnifiedManagementPage.tsx` | Afficher `agency.label` + ajouter bouton création + actions utilisateur |
| `src/hooks/use-user-management.ts` | Enrichir les users avec `agencyLabel` |
| `src/components/admin/users/UserAccordionItem.tsx` | Afficher `agencyLabel` au lieu de `agence` (slug) |
| `src/hooks/user-management/types.ts` | Ajouter `agencyLabel?: string` au type `UserProfile` |

---

## Impact

- **Bouton "Nouvel utilisateur"** : Visible pour les utilisateurs ayant les droits de création (N2+ selon leur scope)
- **Colonne Agence** : Affichera "DAX", "SAINT-OMER", etc. au lieu des UUIDs ou slugs
- **Compatibilité** : Les deux pages (`TDRUsersPage` et `UnifiedManagementPage`) seront fonctionnelles
