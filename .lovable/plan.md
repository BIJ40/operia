

## Correction du paramètre code postal pour l'API Apogée

### Problème confirmé
Les deux points d'appel à `apiGetProjectByHashZipCode` envoient `zipCode` et `zipcode`, mais l'API Apogée attend `codePostal`. Résultat : 500 ou comparaison échouée → "code postal incorrect".

### Modifications

**1. `src/services/apogeeProxy.ts` (lignes 396-402)**
- Remplacer la construction des filtres pour envoyer `codePostal` (en extrayant les 5 premiers chiffres)
- Supprimer les doublons `zipCode`/`zipcode` inutiles

```ts
getProjectByHash: (options) => {
  const raw = String(options.filters.zipCode ?? options.filters.codePostal ?? '');
  const codePostal = raw.match(/\d{5}/)?.[0] ?? raw.trim();
  const filters = {
    ref: options.filters.ref,
    hash: options.filters.hash,
    codePostal,
  };
  return proxyRequest('apiGetProjectByHashZipCode', { ...options, filters, skipCache: true });
},
```

**2. `supabase/functions/suivi-api-proxy/index.ts` (fonction `buildHashZipPayloads`, lignes 144-155)**
- Ajouter `codePostal` au payload envoyé à l'API Apogée
- Garder `zipCode`/`zipcode` en fallback au cas où

```ts
return values.map((value) => ({
  ref: refDossier,
  hash,
  codePostal: value,
  zipCode: value,
  zipcode: value,
}));
```

**3. Redéployer** l'edge function `suivi-api-proxy`

**4. Tester** avec le dossier 202601008 / hash 5fbe517f / code postal 40320

### Impact
- Aucun impact sur les autres