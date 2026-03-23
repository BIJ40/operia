

# Diagnostic : Dossiers manquants dans CA Planifié

## Cause identifiée

Le filtre `isDevisToOrder` (ligne 71-74) ne reconnaît que 3 états de devis :
- `to order`
- `to_order`
- `order`

Or l'API Apogée peut renvoyer d'autres variantes pour un devis validé/accepté : `accepted`, `signed`, `validated`, `commande`, etc.

De plus, la **condition "pas facturé"** exclut tout projet ayant ne serait-ce qu'un acompte ou une facture partielle.

## 4 filtres successifs qui éliminent des dossiers

| # | Condition | Risque d'exclusion abusive |
|---|---|---|
| 1 | Pas de facture associée | Un acompte suffit à exclure le dossier |
| 2 | Intervention future (date >= aujourd'hui) | Interventions sans date ou mal datées |
| 3 | Mois dominant = mois sélectionné | Dossier à cheval sur 2 mois |
| 4 | Devis état "to order" avec montant > 0 | **Principale cause** — états non reconnus |

## Plan de correction

### 1. Elargir `isDevisToOrder` pour accepter plus d'états valides

Dans `CAPlanifieDetailDialog.tsx`, modifier le filtre pour inclure les états courants Apogée :

```typescript
const VALID_DEVIS_STATES = new Set([
  'to order', 'to_order', 'order',
  'accepted', 'signed', 'validated', 
  'commande', 'commandé', 'à commander',
]);

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return VALID_DEVIS_STATES.has(state);
};
```

### 2. Même correction dans `CAPlanifieCard.tsx`

Le calcul KPI de la tuile utilise un filtre similaire — il faut le synchroniser pour que le nombre de dossiers et le montant correspondent.

### 3. Assouplir la condition "pas facturé"

Ne pas exclure un dossier qui a uniquement un **acompte** (type facture = `acompte`). Seules les factures de type `facture` (définitives) devraient exclure le projet.

### 4. Appliquer la même logique dans `chargeTravauxEngine.ts`

Le moteur StatIA utilise aussi `isDevisToOrder` — harmoniser pour que tous les indicateurs soient cohérents.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/apogee-connect/components/stats-hub/CAPlanifieDetailDialog.tsx` | Elargir `isDevisToOrder`, assouplir filtre factures |
| `src/apogee-connect/components/stats-hub/CAPlanifieCard.tsx` | Même correction sur le filtre devis |
| `src/statia/shared/chargeTravauxEngine.ts` | Harmoniser `isDevisToOrder` |

