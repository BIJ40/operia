# AUDIT MODULE RÉSEAU FRANCHISEUR
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Module de pilotage multi-agences pour les franchiseurs (N3+). Permet de visualiser et comparer les performances du réseau, gérer les agences, et suivre les redevances.

### Routes
- `/hc-reseau` - Dashboard réseau
- `/hc-reseau/agences` - Liste agences
- `/hc-reseau/agences/:id` - Profil agence
- `/hc-reseau/stats` - Statistiques réseau
- `/hc-reseau/periodes` - Comparaison périodes
- `/hc-reseau/redevances` - Calcul redevances (N4+)

### Tables Supabase
```
apogee_agencies              - Agences du réseau
franchiseur_agency_assignments - Affectations animateurs/directeurs
agency_royalty_config        - Configuration redevances
agency_royalty_tiers         - Tranches redevances
agency_royalty_calculations  - Calculs historiques
animator_visits              - Visites animateurs
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/franchiseur/
├── context/
│   └── FranchiseurContext.tsx    # État filtre agences
├── components/
│   ├── FranchiseurLayout.tsx     # Layout avec filtre
│   ├── FranchiseurDashboard.tsx  # Dashboard
│   ├── AgencesList.tsx           # Liste agences
│   ├── AgenceProfile.tsx         # Profil détaillé
│   └── RedevancesCalculator.tsx  # Calcul redevances
├── hooks/
│   └── useFranchiseurAgencies.ts # Données agences
└── utils/
    └── networkCalculations.ts    # Calculs réseau
```

### Contexte et filtres
```typescript
// FranchiseurContext
- selectedAgencies: string[]      // Agences sélectionnées
- persistance localStorage + URL params
```

## 3. ACCÈS PAR RÔLE

### Visibilité agences
```typescript
// N3 (Animateur)
- Si assigné: uniquement agences assignées
- Si non assigné: aucune agence

// N4 (Directeur réseau)
- Si assigné: uniquement agences assignées
- Si non assigné: TOUTES les agences

// N5/N6
- Toutes les agences
```

### Fonctionnalités par rôle
```
N3: Dashboard, Stats, Périodes
N4+: + Redevances, Gestion agences
N5+: + Configuration système
```

## 4. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ `calculateMonthlyRoyalties` - TODO ligne 273
- ⚠️ Persistance filtres peut être lente

### P2 - Améliorations
- 📝 Export comparatif agences
- 📝 Alertes performance
- 📝 Benchmark secteur

## 5. SÉCURITÉ

### RLS agences
```sql
-- Visibilité selon rôle
SELECT: 
  has_min_global_role('platform_admin') 
  OR (
    has_min_global_role('franchisor_user') 
    AND (
      NOT EXISTS(SELECT 1 FROM franchiseur_agency_assignments WHERE user_id = auth.uid())
      OR id IN (SELECT agency_id FROM franchiseur_agency_assignments WHERE user_id = auth.uid())
    )
  )
  OR id = get_user_agency_id()
```

### Points d'attention
- ✅ Animateurs voient uniquement agences assignées
- ✅ Données financières (redevances) N4+ uniquement
- ✅ Modification profil agence N4+ uniquement

## 6. PERSISTANCE FILTRES

### Mécanisme
```typescript
// URL params (prioritaire)
?agencies=LEMANS,MONTAUBAN

// localStorage (fallback)
franchiseur_selected_agencies: ["LEMANS", "MONTAUBAN"]

// Ordre de priorité
1. URL params
2. localStorage
3. Toutes agences (défaut)
```

### Survit à
- Rechargement page
- Changement onglet navigateur
- Navigation interne

## 7. CALCUL REDEVANCES

### Modèle tranches
```typescript
interface RoyaltyTier {
  from_amount: number
  to_amount: number | null
  percentage: number
}

// Exemple
0 - 100k€: 5%
100k - 300k€: 4%
300k+: 3%
```

### Calcul
```typescript
// CA cumulé annuel → tranches progressives
function calculateRoyalty(caCumul: number, tiers: RoyaltyTier[]): number {
  let total = 0
  for (const tier of tiers) {
    const tierAmount = Math.min(
      Math.max(0, caCumul - tier.from_amount),
      (tier.to_amount ?? Infinity) - tier.from_amount
    )
    total += tierAmount * (tier.percentage / 100)
  }
  return total
}
```

## 8. TESTS RECOMMANDÉS

```typescript
// Visibilité agences
1. N3 assigné voit uniquement ses agences
2. N4 non assigné voit toutes les agences
3. N4 assigné voit uniquement ses agences

// Filtres
1. Sélectionner agences
2. Recharger page
3. Vérifier filtres conservés

// Redevances
1. Configurer tranches
2. Calculer pour une agence
3. Vérifier calcul progressif correct
```

## 9. ÉVOLUTIONS PRÉVUES

1. Finaliser `calculateMonthlyRoyalties`
2. Export comparatif multi-agences
3. Alertes seuils performance
4. Benchmark anonymisé réseau
5. Planning visites animateurs intégré
