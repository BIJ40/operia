
# Plan de Correction - Bug "Salariés" coché par défaut

## Résumé du Problème

La case "Salariés" (module `rh`) est cochée par défaut dans le popup de permissions pour Gregory Gauthier, alors qu'il ne devrait pas avoir ce module activé.

### Cause Identifiée

1. **Données Legacy** : La colonne `profiles.enabled_modules` (format JSONB déprécié) contient encore des données anciennes :
   ```json
   {"rh": {"enabled": true, "options": {"coffre": true, "rh_admin": false, "rh_viewer": false}}}
   ```

2. **Source de Vérité Correcte** : La table `user_modules` (nouvelle source de vérité) ne contient PAS de module `rh` pour cet utilisateur - seulement `ticketing` et `aide`.

3. **Fuite de Données** : Le SDK Supabase peut retourner le champ `enabled_modules` du profil même s'il n'est pas explicitement dans le SELECT, ce qui pollue l'objet `profile` avant l'enrichissement.

## Correction Technique

### Fichier : `src/hooks/use-user-management.ts`

**Modification** (lignes 239-244) : Exclure explicitement le champ legacy `enabled_modules` du profil avant de le fusionner avec les données propres de `user_modules` :

```typescript
// AVANT
const enrichedUsers = profilesData?.map(profile => {
  const userModules = modulesByUser.get(profile.id);
  const enabled_modules = userModulesToEnabledModules(userModules ?? []);
  return { ...profile, enabled_modules };
}) ?? [];

// APRÈS
const enrichedUsers = profilesData?.map(profile => {
  const userModules = modulesByUser.get(profile.id);
  const enabled_modules = userModulesToEnabledModules(userModules ?? []);
  // ✅ Exclure explicitement le JSONB legacy pour éviter toute pollution
  const { enabled_modules: _legacyIgnored, ...cleanProfile } = profile as any;
  return { ...cleanProfile, enabled_modules };
}) ?? [];
```

## Résultat Attendu

- Le popup affichera uniquement les modules réellement présents dans `user_modules` pour chaque utilisateur
- Pour Gregory Gauthier : seuls `ticketing` et `aide` seront cochés (pas `rh`)
- Les données legacy dans `profiles.enabled_modules` seront complètement ignorées

## Impact

- **Fichiers modifiés** : 1 (`src/hooks/use-user-management.ts`)
- **Risque** : Faible - modification isolée dans la couche de données
- **Test recommandé** : Vérifier le popup de permissions pour Gregory Gauthier après déploiement
