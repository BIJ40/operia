

## Diagnostic : Devis acceptés sous-comptés dans le module Commercial

### Problème

Dans `useApporteurDashboardLive.ts`, les devis "validés" sont filtrés par leur **état actuel** uniquement :

```typescript
const validDevisStates = ['validated', 'signed', 'order', 'accepted'];
```

Un devis qui a été accepté puis facturé passe en état `'invoice_sent'`, `'invoiced'`, `'done'` ou similaire. Il sort donc du filtre et n'est plus compté comme "signé". Le fallback `d.refId || d.invoiceId` ne couvre pas tous les cas car ces champs ne sont pas toujours renseignés sur l'objet devis.

Résultat : NESTENN affiche 1/43 au lieu de ~26/43.

### Règle métier (project knowledge)

> Devis avec facture liée = automatiquement validé  
> États validés : validated, signed, order, accepted

Un devis doit être compté comme "transformé" si :
1. Son état actuel est dans `['validated', 'signed', 'order', 'accepted']`, **OU**
2. Il possède un champ `refId` / `invoiceId` renseigné, **OU**
3. **Il existe une facture dans la période liée au même `projectId`** (preuve de transformation)

Le critère 3 est celui qui manque et qui représente la majorité des cas (devis passés en "facturé").

### Correction

**Fichier** : `src/prospection/hooks/useApporteurDashboardLive.ts`

Après avoir construit `apporteurFactures` (ligne ~92), ajouter un `Set` des `projectId` facturés. Puis dans le filtre `signedDevis`, ajouter une 3e condition :

```typescript
// Construire le set des projets qui ont au moins une facture
const facturatedProjectIds = new Set(
  apporteurFactures.map((f: any) => String(f.projectId ?? f.project_id))
);

const signedDevis = apporteurDevis.filter((d: any) => {
  // 1. État actuel = validé
  if (validDevisStates.includes(d.state?.toLowerCase?.())) return true;
  // 2. Lien direct vers facture
  if (d.refId || d.invoiceId) return true;
  // 3. Le projet du devis a été facturé = devis transformé
  const dProjectId = String(d.projectId ?? d.project_id);
  if (facturatedProjectIds.has(dProjectId)) return true;
  return false;
});
```

Appliquer la même logique dans la section **tendances mensuelles** (ligne ~186) :

```typescript
if (validDevisStates.includes(d.state?.toLowerCase?.()) 
    || d.refId || d.invoiceId
    || facturatedProjectIds.has(String(d.projectId ?? d.project_id))) {
  m.devis_signed++;
}
```

Aucun autre fichier n'est impacté : la page dashboard (`ApporteurDashboardPage.tsx`) et les composants de comparaison consomment les KPIs calculés par ce hook.

### Résultat attendu

Pour NESTENN : ~26 devis validés sur 43 émis au lieu de 1/43, reflétant tous les devis dont le projet a été effectivement facturé dans la période.

