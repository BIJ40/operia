

## Plan : Intégrer `apiGetProjectByHashZipCode`

3 fichiers à modifier, aucune rupture de l'existant.

### 1. Edge Function `proxy-apogee` — Whitelist

Ajouter `'apiGetProjectByHashZipCode'` au tableau `ALLOWED_ENDPOINTS` (ligne 95-110). Pas de masquage nécessaire (les docs PDF ne contiennent pas de PII directe dans la réponse JSON).

### 2. `src/apogee-connect/types/endpoints.ts` — Référencement

Ajouter l'entrée :
```typescript
/** Récupère un projet par hash+zipCode (documents générés PDF) */
PROJECT_BY_HASH: "apiGetProjectByHashZipCode",
```

### 3. `src/services/apogeeProxy.ts` — Méthode typée

Ajouter une méthode `getProjectByHash` sur l'interface `ApogeeProxy` et son implémentation. Les filtres `ref`, `hash`, `zipCode` + `zipcode` (doublon lowercase pour compatibilité API) sont passés via le champ `filters` existant, qui est déjà spreadé dans le body côté serveur (`...filters`).

```typescript
// Interface
getProjectByHash: <T = unknown>(options: ApogeeProxyOptions & {
  filters: { ref: string; hash: string; zipCode: string };
}) => Promise<T>;

// Implémentation — injecte automatiquement zipcode en doublon
getProjectByHash: (options) => {
  const filters = {
    ...options.filters,
    zipcode: options.filters.zipCode, // doublon lowercase pour compatibilité API
  };
  return proxyRequest('apiGetProjectByHashZipCode', { ...options, filters, skipCache: true });
},
```

`skipCache: true` par défaut car cet endpoint retourne des données spécifiques à un dossier (pas de bénéfice au cache global).

### Ce qui ne change PAS

- Aucune modification des autres endpoints
- Aucune modification du masquage de données
- Aucune modification du rate limiting
- Aucune migration DB

