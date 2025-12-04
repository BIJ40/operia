# AUDIT COMPLET MODULE 7 : PILOTAGE FRANCHISEUR

**Date** : 2025-12-04  
**Version** : V1.0  
**Score de maturité global** : **80%** (Production-ready avec corrections P1)

---

## 1. SYNTHÈSE EXÉCUTIVE

### 1.1 État Général

Le Module Pilotage Franchiseur présente une architecture **solide et bien structurée** avec une bonne séparation des responsabilités. Points forts majeurs :

✅ **StatIA Engines dédiés** - `reseauDashboardEngine.ts` et `comparatifAgencesEngine.ts`  
✅ **Proxy sécurisé** - `NetworkDataService` via `apogeeProxy`  
✅ **Gestion des avoirs** - Correcte dans les engines StatIA  
✅ **FranchiseurContext** - Dérivation correcte des rôles depuis `global_role`  
✅ **Composants partagés** - Réutilisation de `TechnicienUniversHeatmap`, `UniversApporteurMatrix`  

### 1.2 Résumé des Anomalies

| Priorité | Nombre | Catégorie principale |
|----------|--------|---------------------|
| **P0** | 1 | Incohérence critique avoirs dans aggregateCA |
| **P1** | 3 | Duplications / incohérences mineures |
| **P2** | 5 | Optimisations / consolidations |

---

## 2. ARCHITECTURE DU MODULE

### 2.1 Organisation des fichiers

```
src/franchiseur/
├── pages/
│   ├── FranchiseurHome.tsx           # Dashboard réseau
│   ├── FranchiseurStats.tsx          # Tableaux (matrices)
│   ├── FranchiseurComparison.tsx     # Périodes (comparatifs N/N-1)
│   ├── ComparatifAgencesPage.tsx     # Comparatif agences
│   ├── ReseauGraphiquesPage.tsx      # Graphiques réseau
│   ├── FranchiseurAgencies.tsx       # Liste agences
│   ├── FranchiseurAgencyProfile.tsx  # Profil agence
│   ├── FranchiseurRoyalties.tsx      # Redevances
│   ├── FranchiseurAnimateurs.tsx     # Animateurs
│   └── FranchiseurSettings.tsx       # Paramètres
├── hooks/
│   ├── useFranchiseurStatsStatia.ts  # Hook StatIA matrices
│   ├── usePeriodComparisonStatia.ts  # Hook comparaison périodes
│   ├── useAgencies.ts                # Liste agences
│   ├── useAgencyList.ts              # Liste avec filtre
│   ├── useAgencyMonthlyCA.ts         # CA mensuel par agence
│   └── useRoyaltyCalculation.ts      # Calcul redevances
├── contexts/
│   ├── FranchiseurContext.tsx        # Rôles et permissions
│   └── NetworkFiltersContext.tsx     # Filtres réseau
├── services/
│   └── networkDataService.ts         # Chargement données multi-agences
├── utils/
│   └── networkCalculations.ts        # Calculs réseau (859 lignes)
└── components/
    ├── filters/
    │   └── NetworkPeriodSelector.tsx
    ├── widgets/
    └── ...

src/statia/engines/
├── reseauDashboardEngine.ts          # Engine Dashboard (702 lignes)
└── comparatifAgencesEngine.ts        # Engine Comparatif (385 lignes)
```

### 2.2 Points forts architecturaux

1. **Moteurs StatIA dédiés** : Calculs centralisés dans `statia/engines/`
2. **Proxy sécurisé** : Toutes les données passent par `apogeeProxy` (isolation agence)
3. **Contexte franchiseur** : Gestion propre des rôles N3/N4/N5+ → animateur/directeur/dg
4. **Réutilisation composants** : `TechnicienUniversHeatmap`, `UniversApporteurMatrix` partagés avec Module 6

### 2.3 Points faibles structurels

1. **Duplication partielle** : `networkCalculations.ts` duplique certains helpers de StatIA engines
2. **Fichier volumineux** : `networkCalculations.ts` (859 lignes)
3. **Incohérence avoirs** : `NetworkDataService.aggregateCA` EXCLUT les avoirs (bug critique)

---

## 3. ANALYSE DES MOTEURS DE CALCUL

### 3.1 CA Réseau (StatIA Engine)

| Critère | Statut | Fichier |
|---------|--------|---------|
| Source | ✅ | `reseauDashboardEngine.ts` L226-245 |
| Avoirs | ✅ | Traités via `extractFactureMeta().montantNetHT` |
| Filtrage états | ✅ | `isFactureStateIncluded()` |
| Période | ✅ | `params.dateStart` / `params.dateEnd` |

### 3.2 CA Réseau (NetworkDataService)

| Critère | Statut | Fichier |
|---------|--------|---------|
| Source | ⚠️ | `networkDataService.ts` L105-134 |
| Avoirs | ❌ **EXCLU** | `.filter((f: any) => f.type !== 'avoir')` L122 |
| Filtrage | ⚠️ | Basique, pas `isFactureStateIncluded` |

**⚠️ P0-01 : Incohérence critique - avoirs exclus**
```typescript
// networkDataService.ts L121-123 - BUG
.filter((f: any) => f.type !== 'avoir')  // ❌ EXCLUT les avoirs
```
**Impact** : CA réseau surestimé si cette fonction est utilisée.

### 3.3 CA par Agence (Comparatif)

| Critère | Statut | Fichier |
|---------|--------|---------|
| Source | ✅ | `comparatifAgencesEngine.ts` |
| Avoirs | ✅ | Via `extractFactureMeta().montantNetHT` |
| 15 KPIs | ✅ | CA, SAV, délais, techniciens |

### 3.4 Agrégation Multi-Agences

| Critère | Statut | Fichier |
|---------|--------|---------|
| Chargement parallèle | ✅ | `NetworkDataService.loadMultiAgencyData` |
| Cache | ✅ | 5 minutes en mémoire |
| Isolation | ✅ | Via `apogeeProxy` |
| Double comptage | ✅ | Non observé |

---

## 4. VÉRIFICATION DES RÈGLES MÉTIER

### 4.1 Factures & Avoirs ⚠️

```
✅ StatIA engines : Avoirs traités comme négatifs (extractFactureMeta)
❌ NetworkDataService.aggregateCA : Avoirs EXCLUS (P0-01)
✅ networkCalculations.ts : Avoirs traités comme négatifs (L59-61, L133-135)
```

### 4.2 Interventions & Visites ✅

```
✅ isInterventionRealisee() centralisée dans engines
✅ SAV détecté via type2.includes('sav')
✅ RT non comptés dans CA technicien
```

### 4.3 Classement Agences ✅

```
✅ Tri par CA cohérent (comparatifAgencesEngine)
✅ Même période pour toutes les agences
✅ 15 KPIs calculés par agence
```

### 4.4 Périmètre Animateur/Directeur/DG ✅

```
✅ Animateur (N3) : Voit uniquement ses agences assignées
✅ Directeur (N4) : Voit toutes les agences
✅ DG (N5/N6) : Accès complet
✅ FranchiseurContext gère correctement les assignments
```

### 4.5 Périodes de temps ✅

```
✅ NetworkFiltersContext uniforme
✅ DateRange appliqué à tous les calculs
✅ Comparaison N-1 via usePeriodComparisonStatia
```

---

## 5. ANOMALIES DÉTECTÉES

### 5.1 P0 - Critique (1 anomalie)

#### P0-01 : Avoirs EXCLUS dans NetworkDataService.aggregateCA

**Fichier** : `src/franchiseur/services/networkDataService.ts`  
**Ligne** : 122  
**Impact** : **CRITIQUE** - CA réseau potentiellement surestimé

```typescript
// AVANT (BUG)
static aggregateCA(agencyData: any[], range: { start: Date; end: Date }): number {
  return agencyData.reduce((sum, agency) => {
    if (!agency.data?.factures) return sum;
    const agencyCA = agency.data.factures
      .filter((f: any) => f.type !== 'avoir')  // ❌ EXCLUT les avoirs
      .reduce((total: number, f: any) => {
        // ...
      }, 0);
    return sum + agencyCA;
  }, 0);
}
```

**Correction requise** : Utiliser `extractFactureMeta` et traiter les avoirs comme négatifs.

---

### 5.2 P1 - Important (3 anomalies)

#### P1-01 : Duplication helpers parseDate / isInterventionRealisee

**Fichiers** :
- `src/statia/engines/reseauDashboardEngine.ts` L69-82
- `src/statia/engines/comparatifAgencesEngine.ts` L51-69
- `src/franchiseur/utils/networkCalculations.ts` L13-29

**Impact** : Risque de divergence si un seul fichier est modifié.

---

#### P1-02 : networkCalculations.ts non utilisé par engines StatIA

**Fichier** : `src/franchiseur/utils/networkCalculations.ts`  
**Impact** : Duplication de logique avec les engines StatIA.

Les functions `calculateTop5Agencies`, `calculateTop3Apporteurs` etc. sont dupliquées avec `reseauDashboardEngine.ts`.

---

#### P1-03 : Pas de vérification cohérence CA réseau = somme CA agences

**Impact** : Aucun contrôle automatique que `sum(CA_agences) == CA_reseau`.

---

### 5.3 P2 - Optimisation (5 anomalies)

| ID | Description | Fichier | Impact |
|----|-------------|---------|--------|
| P2-01 | Console.log en production | reseauDashboardEngine.ts L95-177 | Performance |
| P2-02 | Chargement séquentiel dans engine | reseauDashboardEngine.ts L144 | Lenteur |
| P2-03 | Pas de pagination/sampling | networkDataService.ts | Surcharge API |
| P2-04 | networkCalculations.ts trop volumineux | 859 lignes | Maintenabilité |
| P2-05 | Cache uniquement en mémoire | networkDataService.ts | Perte au refresh |

---

## 6. COHÉRENCE MODULE 6 VS MODULE 7

### 6.1 Points vérifiés

| Métrique | Module 6 | Module 7 | Cohérent |
|----------|----------|----------|----------|
| CA global | `extractFactureMeta` | `extractFactureMeta` (engines) | ✅ |
| Avoirs | Montants négatifs | Montants négatifs (engines) | ✅ |
| technicienEngine | `technicienUniversEngine.ts` | Même fichier réutilisé | ✅ |
| Univers | `normalizeUniverseSlug` | Même normalisation | ✅ |
| Apporteurs | `commanditaireId` | Même logique | ✅ |

### 6.2 Divergence identifiée

| Métrique | Module 6 | Module 7 | Note |
|----------|----------|----------|------|
| aggregateCA | N/A | Exclut avoirs (P0-01) | ❌ BUG |

---

## 7. SÉCURITÉ ET PERMISSIONS

### 7.1 Points vérifiés ✅

```
✅ Routes protégées par ModuleGuard (reseau_franchiseur)
✅ FranchiseurContext vérifie isFranchiseur / isAdmin
✅ Animateurs voient uniquement leurs agences assignées
✅ apogeeProxy isole les appels par agence
✅ Pas de fuite de données inter-agences observée
```

### 7.2 Architecture permissions

```typescript
// FranchiseurContext.tsx - Correct
function deriveFranchiseurRole(globalRole: string | null): FranchiseurRole {
  switch (globalRole) {
    case 'superadmin':
    case 'platform_admin':
      return 'dg';
    case 'franchisor_admin':
      return 'directeur';
    case 'franchisor_user':
      return 'animateur';
    default:
      return null;
  }
}
```

---

## 8. PERFORMANCE ET UX

### 8.1 Stratégie de cache

| Composant | Cache | TTL |
|-----------|-------|-----|
| NetworkDataService | ✅ In-memory Map | 5 min |
| useFranchiseurStatsStatia | ✅ React Query | 5 min |
| comparatifAgencesEngine | ✅ Via hook | 5 min |

### 8.2 Latences identifiées

| Opération | Latence estimée | Optimisation possible |
|-----------|-----------------|----------------------|
| Chargement 50 agences | ~30-60s | Parallélisation + batch |
| Calcul comparatif | ~5-10s | OK (séquentiel nécessaire) |
| Cache miss | ~2-3s/agence | Rate limiting proxy |

### 8.3 Points d'attention

⚠️ Chargement séquentiel dans `reseauDashboardEngine` (L144 : `for...of`)  
⚠️ Pas de pagination pour grosses volumétries  
⚠️ Console.log verbeux en production

---

## 9. PLAN DE CORRECTION OPÉRATIONNEL

### 9.1 P0-01 : Corriger avoirs dans NetworkDataService.aggregateCA

```typescript
// src/franchiseur/services/networkDataService.ts L105-134

// APRÈS (CORRIGÉ)
static aggregateCA(agencyData: any[], range: { start: Date; end: Date }): number {
  const parseDate = (value: string): Date | null => {
    // ... (existant)
  };

  return agencyData.reduce((sum, agency) => {
    if (!agency.data?.factures) return sum;
    const agencyCA = agency.data.factures
      // NE PLUS filtrer les avoirs ici
      .reduce((total: number, f: any) => {
        const dateStr = f.dateReelle || f.dateEmission || f.created_at;
        const d = dateStr ? parseDate(dateStr) : null;
        if (!d || !isWithinInterval(d, range)) return total;

        const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
        const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
        
        // Traiter avoirs comme négatifs
        const typeFacture = (f.type || f.typeFacture || '').toLowerCase();
        const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
        
        return total + montantNet;
      }, 0);
    return sum + agencyCA;
  }, 0);
}
```

### 9.2 P1-01 : Centraliser helpers dans StatIA normalizers

Importer `parseDate`, `isInterventionRealisee`, `isSAVIntervention` depuis un module partagé.

### 9.3 P1-02 : Déprécier networkCalculations.ts legacy

Marquer les fonctions dupliquées comme `@deprecated` et rediriger vers StatIA engines.

### 9.4 P1-03 : Ajouter assertion cohérence CA

```typescript
// Dans reseauDashboardEngine après calcul
const sumCAAgences = agencyData.reduce((s, a) => s + a.caPeriode, 0);
if (Math.abs(sumCAAgences - caPeriodeReseau) > 1) {
  logError('STATIA', 'Incohérence CA réseau vs somme agences', { sumCAAgences, caPeriodeReseau });
}
```

---

## 10. RECOMMANDATIONS ARCHITECTURE 2025

### 10.1 Architecture cible

```
src/statia/
├── engines/
│   ├── reseauDashboardEngine.ts    # Dashboard réseau (existant)
│   ├── comparatifAgencesEngine.ts  # Comparatif (existant)
│   └── networkAggregationEngine.ts # Agrégation CA réseau (NEW)
├── normalizers/
│   └── index.ts                    # parseDate, isInterventionRealisee centralisés
└── shared/
    └── helpers.ts                  # Helpers partagés Module 6 + 7

src/franchiseur/
├── hooks/                          # Hooks React Query uniquement
├── services/
│   └── networkDataService.ts       # Chargement données (simplifié)
└── utils/
    └── networkCalculations.ts      # À DÉPRÉCIER progressivement
```

### 10.2 Tests automatisés recommandés

```typescript
// src/statia/__tests__/reseauDashboardEngine.test.ts
describe('reseauDashboardEngine', () => {
  test('CA réseau = somme CA agences', async () => {
    const result = await computeReseauDashboard(params);
    const sumAgences = result.blocCA.partCAParAgence.reduce((s, a) => s + a.ca, 0);
    expect(sumAgences).toBeCloseTo(result.tuilesHautes.caPeriode, 0);
  });
  
  test('Avoirs réduisent le CA', async () => {
    // Mock avec avoir
    const result = await computeReseauDashboard(paramsWithAvoir);
    expect(result.tuilesHautes.caPeriode).toBeLessThan(caFacturesBrut);
  });
});
```

---

## 11. CONCLUSION

Le Module Pilotage Franchiseur est **production-ready à 80%** avec une correction P0 obligatoire.

### Forces
- Architecture StatIA bien structurée
- Proxy sécurisé pour isolation agences
- Composants partagés avec Module 6
- Gestion correcte des rôles N3/N4/N5+

### Corrections prioritaires
| Ticket | Description | Priorité |
|--------|-------------|----------|
| P0-01 | Avoirs dans NetworkDataService.aggregateCA | **CRITIQUE** |
| P1-01 | Centraliser helpers parseDate/isIntervention | Important |
| P1-02 | Déprécier networkCalculations legacy | Important |
| P1-03 | Assertion cohérence CA réseau | Important |

### Score après corrections
- P0 corrigé : **85%**
- P0 + P1 corrigés : **92%**
- P0 + P1 + P2 corrigés : **95%**
