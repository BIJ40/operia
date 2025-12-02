# Indicateur RECOUVREMENT

## Définition

Le **recouvrement** est l'indicateur clé qui mesure le montant restant à recouvrer auprès des clients.

### Formule

```
Recouvrement = Total des factures TTC - Total des règlements reçus
```

## Source de vérité

### Données

- **Factures** : Chargées depuis l'API Apogée via `DataService.loadAllData()`
- **Type** : Interface `Facture` définie dans `src/apogee-connect/types/index.ts`

### Champs utilisés

| Champ | Description | Type |
|-------|-------------|------|
| `facture.totalTTC` | Montant total TTC de la facture | `number` |
| `facture.calc.paidTTC` | Total des règlements reçus pour cette facture | `number` |
| `facture.typeFacture` | Type de facture (`'avoir'` ou autre) | `string` |
| `facture.date` | Date d'émission de la facture | `string` (ISO) |

### Gestion des avoirs

Les **avoirs** (credit notes) sont traités comme des factures TTC **négatives** :

```typescript
if (typeFacture === 'avoir') {
  totalFacturesTTC -= Math.abs(montantTTC);
} else {
  totalFacturesTTC += montantTTC;
}
```

Cette approche garantit la cohérence mathématique :
- Un avoir de 500€ réduit le montant total facturé de 500€
- Le recouvrement reflète correctement la dette client nette

### Gestion des règlements multiples

Les règlements sont agrégés par l'API Apogée dans le champ `calc.paidTTC` :
- Une facture peut avoir plusieurs paiements partiels
- `calc.paidTTC` contient la **somme totale** de tous les règlements reçus
- `calc.restePaidTTC` contient le reste à payer (non utilisé dans notre calcul)

## Implémentation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Apogée                                │
│              (source de données brutes)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              DataService.loadAllData()                       │
│              (cache + chargement)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     recouvrementCalculations.ts                              │
│     calculateRecouvrement()                                  │
│     (logique métier centralisée)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     use-recouvrement-stats.ts                                │
│     useRecouvrementStats() hook                              │
│     (intégration React Query)                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     RecouvrementTile.tsx                                     │
│     (composant UI)                                           │
└─────────────────────────────────────────────────────────────┘
```

### Fichiers clés

1. **`src/apogee-connect/utils/recouvrementCalculations.ts`**
   - Fonction centrale : `calculateRecouvrement()`
   - Fonctions par dimension : `calculateRecouvrementByClient()`, `calculateRecouvrementByProject()`
   - Interface : `RecouvrementStats`

2. **`src/apogee-connect/hooks/use-recouvrement-stats.ts`**
   - Hook principal : `useRecouvrementStats()`
   - Hooks par dimension : `useRecouvrementByClient()`, `useRecouvrementByProject()`

3. **`src/apogee-connect/components/kpi/RecouvrementTile.tsx`**
   - Tuile KPI réutilisable
   - Tooltip avec détails (facturé, règlements, nombre de factures)
   - Couleur adaptative selon le montant

## Utilisation

### Dans un composant

```tsx
import { useRecouvrementStats } from '@/apogee-connect/hooks/use-recouvrement-stats';
import { formatEuros } from '@/apogee-connect/utils/formatters';

function MyComponent() {
  const { data, isLoading, error } = useRecouvrementStats({
    includeDetails: true
  });

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur</div>;

  return (
    <div>
      <h3>Recouvrement</h3>
      <p>{formatEuros(data.recouvrement)}</p>
      <small>Facturé : {formatEuros(data.totalFacturesTTC)}</small>
      <small>Règlements : {formatEuros(data.totalReglementsRecus)}</small>
    </div>
  );
}
```

### Avec la tuile KPI

```tsx
import { RecouvrementTile } from '@/apogee-connect/components/kpi/RecouvrementTile';

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <RecouvrementTile />
      {/* autres tuiles */}
    </div>
  );
}
```

## Interprétation

| Valeur | Signification | Action |
|--------|---------------|--------|
| `> 0` | Reste à recouvrer | Relancer les clients, suivre les paiements |
| `= 0` | Tout est recouvré | Situation idéale, aucune action nécessaire |
| `< 0` | Trop-perçu | Régulariser (avoir à émettre, remboursement) |

## Cas de test

### Test 1 : Facture non payée
```typescript
Factures : 1000€ TTC
Règlements : 0€
→ Recouvrement = 1000€ (reste à recouvrer)
```

### Test 2 : Facture partiellement payée
```typescript
Factures : 1000€ TTC
Règlements : 400€
→ Recouvrement = 600€ (reste à recouvrer)
```

### Test 3 : Facture totalement payée
```typescript
Factures : 1000€ TTC
Règlements : 1000€
→ Recouvrement = 0€ (situation idéale)
```

### Test 4 : Trop-perçu
```typescript
Factures : 1000€ TTC
Règlements : 1200€
→ Recouvrement = -200€ (régularisation nécessaire)
```

### Test 5 : Avec avoir
```typescript
Factures : 1000€ TTC
Avoir : -200€ TTC
Règlements : 600€
→ Total facturé TTC : 800€
→ Recouvrement = 800€ - 600€ = 200€
```

## Filtrage

Le calcul de recouvrement respecte les filtres globaux de l'application :

- **Période** : Filtrage par `facture.date` dans l'intervalle `[start, end]`
- **Agence** : Déjà géré par le contexte `AgencyContext` (BASE_URL spécifique)
- **Client** : Disponible via `calculateRecouvrementByClient()`
- **Projet** : Disponible via `calculateRecouvrementByProject()`

## Robustesse

### Gestion des erreurs

- Dates invalides ignorées (try/catch)
- Montants invalides ignorés avec log warning
- Factures sans date ignorées
- Retour de valeurs par défaut (0) en cas de problème

### Cohérence des données

- ✅ Pas de double comptage : chaque facture comptée une seule fois
- ✅ Avoirs traités de manière cohérente (négatifs)
- ✅ Règlements agrégés par l'API (pas de risque de duplication)
- ✅ Alignement avec les autres KPI (CA, paiements)

### Performance

- Cache DataService (TTL 5 minutes)
- React Query avec staleTime 5 minutes
- Calculs côté client (pas d'edge function nécessaire)

## Sécurité

- ✅ Utilise les RLS existantes (données chargées via Supabase client authentifié)
- ✅ Respect des permissions utilisateur
- ✅ Logs avec `logApogee` pour traçabilité

## Extensions futures

Le système est conçu pour être facilement extensible :

1. **Recouvrement par apporteur**
   - Ajouter `calculateRecouvrementByApporteur()`
   - Nécessite mapping `facture → projet → apporteur`

2. **Recouvrement par univers**
   - Ajouter `calculateRecouvrementByUniverse()`
   - Nécessite mapping `facture → projet → universes`

3. **Historique de recouvrement**
   - Stocker les calculs mensuels en base
   - Afficher l'évolution temporelle

4. **Alertes automatiques**
   - Notifications si recouvrement > seuil
   - Alertes clients impayés > 60 jours
