
# Plan de correction : Technicien fantôme sur Diffusion TV

## Problème identifié

Sur le podium Diffusion TV, le 3ème technicien affiche **~1700€ de CA sans nom** (affiché comme "Tech 3" ou vide). Ce technicien n'apparaît pas sur la page Techniciens.

## Cause racine

Dans `src/statia/engines/unifiedTechCAEngine.ts:359-376`, la fonction `getUserInfo()` gère le cas où un `userId` présent dans les visites n'existe pas dans la liste `users` retournée par l'API :

```typescript
if (user) {
  // ... résolution nom
  return { name: fullName, color, isActive };
}
// PROBLÈME : fallback générique quand l'user n'existe pas
return { name: `Tech ${techId}`, color: '#808080', isActive: true };
```

Ce fallback crée un technicien "fantôme" avec :
- Un nom générique (`Tech 12345`)
- Une couleur grise par défaut
- `isActive: true` par défaut → il reçoit du CA via le lissage

### Pourquoi cet ID n'a pas de profil ?

Causes possibles :
1. Utilisateur supprimé ou désactivé dans Apogée
2. Utilisateur d'une autre agence (filtrage API)
3. Données incohérentes (visite avec un `userId` invalide)

## Solution proposée

### 1. Exclure les techniciens sans profil valide

Modifier `getUserInfo()` pour retourner un flag `exists: false` quand l'utilisateur n'est pas trouvé, puis filtrer ces techniciens du calcul CA :

```text
Fichier: src/statia/engines/unifiedTechCAEngine.ts

AVANT (ligne 375):
return { name: `Tech ${techId}`, color: '#808080', isActive: true };

APRÈS:
return { name: `Tech ${techId}`, color: '#808080', isActive: false, exists: false };
```

### 2. Ne pas distribuer de CA aux techniciens inexistants

Dans la boucle de répartition (lignes 416-444), ajouter une vérification :

```typescript
const userInfo = getUserInfo(techId);

// NOUVEAU: Ignorer les techniciens sans profil valide
if (!userInfo.exists) {
  logDebug('[UNIFIED TECH CA] Technicien fantôme ignoré:', { techId });
  continue;
}
```

### 3. Exclure du lissage

Le CA des factures "sans temps productif" ne doit être distribué qu'aux techniciens **réellement existants**. Le code actuel (ligne 451) distribue déjà uniquement aux techStats existants, donc ce point est OK.

### 4. Ajouter du debug pour identifier l'ID exact

Ajouter un log pour tracer les IDs fantômes :

```typescript
// Dans calculateTechTimeByProject(), après extraction des usersIds
for (const userId of usersIds) {
  const user = usersMap.get(userId);
  if (!user) {
    logDebug('[UNIFIED TECH CA] UserId fantôme dans visite:', { userId, projectId });
  }
}
```

## Fichiers impactés

| Fichier | Modification |
|---------|--------------|
| `src/statia/engines/unifiedTechCAEngine.ts` | Modifier `getUserInfo()` + ajouter filtrage |

## Résultat attendu

1. Le technicien sans profil valide ne recevra plus de CA
2. Son CA sera redistribué aux autres techniciens via le lissage
3. Le podium n'affichera que des techniciens avec un nom valide
4. Cohérence entre Diffusion TV et page Techniciens

## Note importante

Cette correction masque un problème de données (userId orphelin). Il serait utile de vérifier côté Apogée pourquoi cet ID apparaît dans les visites sans avoir de profil utilisateur correspondant.
