## Refonte Veille Apporteurs — Scoring adaptatif unifié pour tous les apporteurs

### Problème actuel

La Veille utilise un moteur séparé (`veilleApporteursEngine.ts` + `veilleApporteurs.ts`) avec des seuils fixes arbitraires (période A/B de 30j, seuil CA 5000€) qui ne correspondent à rien de concret. Le scoring adaptatif (moyennes historiques propres) n'existe que dans les fiches individuelles. Résultat : incohérence totale entre la vue liste et les fiches, et des classifications faussées (un apporteur à 0€ classé "sain").

### Solution

Abandonner l'ancien moteur de veille. Calculer le **score adaptatif** (celui des fiches individuelles) pour **TOUS** les apporteurs d'un coup, en un seul chargement de données Apogée. La Veille devient une vue consolidée utilisant exactement la même logique que les fiches.

### Architecture

```text
apogeeProxy.getAllData(agence)
        │
        ▼
useVeilleAdaptive()          ← NOUVEAU hook, remplace useVeilleApporteurs
  │
  ├─ Pour chaque apporteur :
  │    └─ computeAdaptiveScore(monthlyTrendFull)  ← même engine que les fiches
  │
  └─ Retourne: VeilleApporteurRow[] avec score, level, metrics, alertes
        │
        ▼
VeilleApporteursTab (refondu)
  ├─ Filtres: Tous | Dormants (0 dossier depuis Xm) | En baisse | Stables | En hausse
  ├─ Réglage: "Depuis X mois" pour dormants, "1 ou 3 mois" pour tendance
  ├─ Tableau enrichi: Score, CA moy, CA récent, Variation, Dossiers, Devis, Factures
  └─ Clic → ouvre la fiche individuelle
```

### Plan d'implémentation

#### 1. Nouveau hook `useVeilleAdaptive`

**Nouveau fichier** : `src/prospection/hooks/useVeilleAdaptive.ts`

Ce hook remplace `useVeilleApporteurs` pour la vue Veille :

- Charge toutes les données de l'agence en une fois via `apogeeProxy.getAllData(agence)`
- Regroupe projets, factures, devis par `commanditaireId`
- Pour chaque apporteur, construit son `monthlyTrendFull` (identique à la logique de `useApporteurDashboardLive`)
- Appelle `computeAdaptiveScore(monthlyTrendFull, recentMonths)` — le même moteur que les fiches
- Calcule en plus : `joursDepuisDernierDossier` (date du dernier projet vs aujourd'hui)
- Paramètre exposé : `recentMonths` (1 ou 3), `seuilDormantMois` (configurable, défaut 2)

Structure retournée par apporteur :

```typescript
interface VeilleApporteurRow {
  apporteurId: string;
  apporteurNom: string;
  // Score adaptatif (même que fiche individuelle)
  score: number;
  level: ScoreLevel; // danger | warning | stable | positive | excellent
  label: string;
  // Métriques détaillées
  caAvgMensuel: number;      // moyenne historique
  caRecentMensuel: number;   // moyenne récente
  caVariationPct: number;
  dossiersAvg: number;
  dossiersRecent: number;
  dossiersVariationPct: number;
  devisAvg: number;
  facturesAvg: number;
  tauxTransfoAvg: number | null;
  // Dormance
  dernierDossierDate: string | null;
  joursInactivite: number;
  isDormant: boolean;         // > seuilDormantMois sans dossier
  // Alertes textuelles
  alerts: string[];
  // Données brutes pour drill-down
  monthlyTrendFull: MonthlyTrendEntry[];
}
```

KPIs agrégés :

```typescript
{
  total: number;
  dormants: number;
  enBaisse: number;    // score < 42
  stables: number;     // score 42-58
  enHausse: number;    // score > 58
}
```

#### 2. Refonte complète du composant `VeilleApporteursTab`

**Réécriture** : `src/prospection/pages/VeilleApporteursTab.tsx`

Structure UI :

- **Barre de contrôle** :
  - Pilules de filtre : Tous | Dormants | En baisse | Stables | En hausse
  - Select "Tendance sur" : 1 mois / 3 mois (change le `recentMonths` du scoring)
  - Select "Dormant si inactif depuis" : 1 mois / 2 mois / 3 mois / 6 mois
  - Recherche par nom
- **Tableau** avec colonnes triables :
  - Nom apporteur
  - Score (jauge visuelle + valeur)
  - Tendance (label : "En forte baisse", "Stable", etc.)
  - CA moy/mois (historique)
  - CA récent/mois
  - Variation CA %
  - Dossiers moy/mois
  - Dernière activité (date + "il y a Xj")
  - Alertes (nombre de signaux)
- Chaque ligne cliquable → ouvre la fiche individuelle
- **Tooltips** sur les en-têtes expliquant le calcul

#### 3. Nettoyage

- `useVeilleApporteurs` : conservé mais plus utilisé par la tab Veille (peut rester pour d'autres usages STATiA)
- L'ancien `veilleApporteursEngine.ts` reste en place (utilisé par STATiA) mais n'est plus la source de la tab Veille
- Pas de suppression pour éviter les régressions

### Fichiers impactés


| Fichier                                           | Action                               |
| ------------------------------------------------- | ------------------------------------ |
| `src/prospection/hooks/useVeilleAdaptive.ts`      | Nouveau — hook de données unifié     |
| `src/prospection/pages/VeilleApporteursTab.tsx`   | Réécriture complète — nouveau design |
| `src/prospection/pages/ProspectionTabContent.tsx` | Mise à jour import                   |


### Cohérence garantie

Le score affiché dans la Veille pour un apporteur sera **exactement le même** que celui affiché dans sa fiche individuelle, car ils utilisent tous les deux `computeAdaptiveScore()` avec les mêmes données `monthlyTrendFull`.  
  
  
Penser az dégager le LEGACY