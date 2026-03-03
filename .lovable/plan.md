

## Scoring intelligent par apporteur basé sur ses propres moyennes historiques

### Principe

Au lieu de seuils fixes globaux, chaque apporteur a ses propres "normales" calculées sur tout l'historique disponible. On détecte les écarts par rapport à **ses propres moyennes mensuelles** sur les 2-3 derniers mois vs l'ensemble de la période.

### Données déjà disponibles

Le hook `useApporteurDashboardLive` charge **toutes** les données de l'apporteur (projets, factures, devis) sans limite de date via le proxy Apogée, puis filtre par période pour les KPIs. Le `monthlyTrend` contient déjà les métriques mois par mois (dossiers, CA, taux transfo).

On a donc tout ce qu'il faut pour calculer des moyennes historiques et détecter les tendances.

### Plan d'implémentation

#### 1. Nouveau moteur de scoring adaptatif

**Nouveau fichier** : `src/prospection/engine/adaptiveScoring.ts`

Logique :
- **Entrée** : `monthlyTrend` (tableau mois par mois avec dossiers, ca_ht, taux_transfo) + KPIs période
- **Calcul des moyennes historiques** : sur tous les mois disponibles (hors les 2-3 derniers)
  - `avgCA` = moyenne mensuelle CA sur l'historique
  - `avgDossiers` = moyenne mensuelle dossiers
  - `avgDevis`, `avgFactures`, `avgTauxTransfo`
- **Calcul de la tendance récente** : moyenne des 2-3 derniers mois
  - `recentAvgCA`, `recentAvgDossiers`, etc.
- **Variation %** pour chaque métrique : `(recent - historique) / historique * 100`
- **Score composite** (0-100) : pondération des variations
  - CA : poids 40%
  - Dossiers : poids 25%
  - Taux transfo : poids 20%
  - Factures : poids 15%
  - Score = 50 (neutre) +/- ajustements selon variations
  - < 35 = alerte baisse, > 65 = tendance hausse, 35-65 = stable

```text
Exemple concret :
Apporteur "NESTENN" — historique 12 mois :
  avgCA/mois = 12 000€, avgDossiers/mois = 8

  3 derniers mois : avgCA = 9 500€, avgDossiers = 5
  → variationCA = -20.8%, variationDossiers = -37.5%
  → Score = 50 - (20.8*0.4 + 37.5*0.25 + ...) ≈ 32 → ALERTE BAISSE

Apporteur "MAIF" — historique 12 mois :
  avgCA/mois = 2 000€, avgDossiers/mois = 3

  3 derniers mois : avgCA = 2 800€, avgDossiers = 4
  → variationCA = +40%, variationDossiers = +33%
  → Score = 50 + ... ≈ 72 → TENDANCE HAUSSE
```

**Retour** :
```typescript
interface AdaptiveScore {
  score: number;              // 0-100
  level: 'danger' | 'warning' | 'stable' | 'positive' | 'excellent';
  label: string;              // "En baisse", "Stable", "En hausse"
  metrics: {
    ca:        { avg: number; recent: number; variationPct: number };
    dossiers:  { avg: number; recent: number; variationPct: number };
    devis:     { avg: number; recent: number; variationPct: number };
    factures:  { avg: number; recent: number; variationPct: number };
    tauxTransfo: { avg: number | null; recent: number | null; variationPct: number | null };
  };
  alerts: string[];           // Messages contextuels
}
```

#### 2. Enrichir `useApporteurDashboardLive`

- Charger les données sur **toute la période connue** (pas de filtre date pour le calcul historique) en plus de la période sélectionnée
- Calculer `monthlyTrendFull` (tous les mois disponibles, pas seulement la période)
- Appeler `computeAdaptiveScore(monthlyTrendFull)` 
- Ajouter `adaptiveScore: AdaptiveScore` au retour du hook

Concrètement : les données brutes sont déjà chargées sans filtre date (l.41-44). Il suffit de construire un 2e `monthlyTrend` sur l'ensemble avant de filtrer.

#### 3. Nouveau composant `ApporteurScoreCard`

**Nouveau fichier** : `src/prospection/components/ApporteurScoreCard.tsx`

Card compacte affichée en haut de la fiche apporteur :
- **Jauge circulaire** : score 0-100 avec couleur (rouge < 35, orange 35-45, vert 45-65, bleu > 65)
- **Label** : "En baisse", "Stable", "En hausse"
- **Mini tableau** des 5 métriques : chacune avec sa moyenne historique, sa valeur récente, et la variation % (flèche verte/rouge)
- **Alertes textuelles** : ex. "CA en baisse de 21% vs votre moyenne", "Dossiers en chute sur 3 mois consécutifs"

#### 4. Intégrer les alertes adaptatives dans `InsightsPanel`

Dans `generateApporteurInsights`, ajouter un paramètre optionnel `adaptiveScore` et générer des insights contextuels :
- "Tendance baissière : CA moyen 9 500€/mois vs moyenne historique de 12 000€ (-21%)"
- "Volume de dossiers en baisse constante sur 3 mois"
- "Taux de transformation en amélioration (+15% vs historique)"

#### 5. Intégrer dans `ApporteurDashboardPage`

- Afficher `ApporteurScoreCard` juste après le header, avant les KPIs
- Les insights enrichis apparaissent naturellement dans le panel existant

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/prospection/engine/adaptiveScoring.ts` | Nouveau — moteur de scoring |
| `src/prospection/hooks/useApporteurDashboardLive.ts` | Ajout monthlyTrendFull + appel scoring |
| `src/prospection/components/ApporteurScoreCard.tsx` | Nouveau — composant visuel |
| `src/prospection/engine/insights.ts` | Ajout insights adaptatifs |
| `src/prospection/pages/ApporteurDashboardPage.tsx` | Intégration du score card |

