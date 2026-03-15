

# Plan d'implémentation — Enrichissement progressif du Prévisionnel

## Confirmations

1. **Rien d'existant n'est supprimé** — les 670 lignes de `PrevisionnelTab.tsx` et les 480 lignes de `chargeTravauxEngine.ts` restent intactes
2. **Le moteur reste la seule source de vérité** — tous les agrégats sont calculés dans `computeChargeTravauxAvenirParUnivers`
3. **Les cards ne recalculent aucune logique métier** — elles reçoivent des props pré-calculées et affichent
4. **La section avancée est purement additive** — insérée entre la table dossiers (l.646) et le debug (l.648)
5. **Ordre d'implémentation respecté** — moteur → hook → enrichissements légers → section → cards → finitions

## Étape 1 — Enrichir `chargeTravauxEngine.ts`

**Interfaces enrichies** (ajout, pas remplacement) :

```ts
// ChargeTravauxProjet — champs ajoutés
createdAt: string | null
ageDays: number | null           // null si date inconnue + flag missing_created_at
riskFlux: number                 // 0-1
riskData: number                 // 0-1
riskValue: number                // 0-1
riskScoreGlobal: number          // 0-1
dataQualityFlags: string[]
includedInForecastCalc: boolean
includedInChargeCalc: boolean
technicianIds: string[]

// ChargeTravauxResult — blocs ajoutés
dataQuality: {
  score: number
  withHours: number
  withDevis: number
  withUnivers: number
  withPlannedDate: number
  total: number
  flags: Record<string, number>
}
pipelineMaturity: {
  commercial: number
  a_commander: number
  pret_planification: number
  planifie: number
  bloque: number
}
pipelineAging: {
  bucket_0_7: number
  bucket_8_15: number
  bucket_16_30: number
  bucket_30_plus: number
  unknown: number
}
riskProjects: Array<{
  projectId: number | string
  reference?: string
  label?: string
  riskScoreGlobal: number
  riskFlux: number
  riskData: number
  riskValue: number
  ageDays: number | null
  devisHT: number
  etatWorkflowLabel: string
}>
chargeByTechnician: Array<{
  technicianId: string
  hours: number
  projects: number
}>
weeklyLoad: Array<{
  weekLabel: string
  weekStart: string
  hours: number
  projects: number
}>
```

**Règles de calcul** dans `computeChargeTravauxAvenirParUnivers` :

- `createdAt` : depuis `project.createdAt` ou `project.data?.createdAt`
- `ageDays` : jours depuis createdAt, **null** si date absente (flag `missing_created_at`)
- `riskFlux` : null→0.5, >30j→1.0, >15j→0.6, >7j→0.3, sinon→0
- `riskData` : `flags.length / 5` (5 flags possibles)
- `riskValue` : pas de devis sur dossier avancé→1.0, devis>5000 + stagnant→0.8, devis<500→0.3, absent sur to_planify→0.4, sinon→0
- `riskScoreGlobal` : `0.25*flux + 0.40*data + 0.35*value`
- `includedInForecastCalc` : devisHT > 0 et devis non draft/rejected/canceled
- `includedInChargeCalc` : totalHeuresTech > 0 et (technicianIds.length > 0 ou date planifiée présente)
- `dataQuality.score` : `100 * (withHours + withDevis + withUnivers + withPlannedDate) / (4 * total)`
- `pipelineMaturity` : logique métier avec priorité planifie > bloque > pret_planification > a_commander > commercial
- `chargeByTechnician` : agrégation par intervention via `itv.userId`/`itv.data?.usersIds`, heures réparties entre techs
- `weeklyLoad` : interventions groupées par semaine ISO (S à S+3), heures sommées
- `pipelineAging` : comptage par tranches d'ageDays
- `riskProjects` : filtré riskScoreGlobal > 0.6, trié desc

Pour `chargeByTechnician`, les heures sont extraites par intervention via `extractHoursFromIntervention`. Si `usersIds` contient N techniciens, les heures sont divisées par N. Pas de double-comptage.

Pour `weeklyLoad`, on parcourt les interventions avec date planifiée (`dateReelle` ou `visites[].date`), on calcule la semaine ISO, on filtre S à S+3 depuis aujourd'hui.

## Étape 2 — Brancher `useChargeTravauxAVenir.ts`

Le hook expose déjà `data: ChargeTravauxResult`. Comme les nouveaux champs sont ajoutés à l'interface, ils seront automatiquement disponibles. Aucune modification structurelle nécessaire.

## Étape 3 — Enrichir `PrevisionnelTab.tsx` (~30 lignes ajoutées, 0 supprimée)

1. **Badge fiabilité** dans la barre de totaux (après le compteur univers, l.316-320) : `Fiabilité {score}%` avec couleur (vert >75, jaune >50, rouge sinon)
2. **Colonne Âge** dans la table dossiers (après CA Devis) : badge coloré (vert 0-7j, jaune 8-15j, orange 16-30j, rouge 30j+, gris si null)
3. **Colonne Risque** dans la table dossiers : badge (vert <0.3, jaune <0.6, rouge ≥0.6)
4. Ajuster `colSpan` de 7 à 9 dans l'empty state

## Étape 4 — Créer `PilotageAvanceSection.tsx`

Fichier : `src/apogee-connect/components/stats-hub/previsionnel/PilotageAvanceSection.tsx`

- Radix `Collapsible` (composant déjà disponible dans `src/components/ui/collapsible.tsx`)
- Fermé par défaut, état persisté via `useSessionState('previsionnel_pilotage_avance', false)`
- Séparateur visuel + titre "Pilotage avancé" + sous-texte
- Grid `md:grid-cols-2 gap-4`, une colonne sur mobile
- Prop unique : `data: ChargeTravauxResult`
- Distribue les sous-props aux 6 cards

## Étape 5 — Créer les 6 cards

Dossier : `src/apogee-connect/components/stats-hub/previsionnel/`

| Composant | Props | Rendu |
|-----------|-------|-------|
| `PipelineMaturityCard` | `data: pipelineMaturity` | Barres horizontales empilées (funnel) avec labels et compteurs |
| `PipelineAgingCard` | `data: pipelineAging` | 4+1 barres colorées par tranche d'âge |
| `RiskDossiersCard` | `projects: riskProjects` | Liste compacte avec badges risque, réf, montant |
| `ChargeTechnicienCard` | `data: chargeByTechnician` | Barres horizontales par technicien |
| `ChargeSemaineCard` | `data: weeklyLoad` | 4 barres verticales S/S+1/S+2/S+3 |
| `FiabilitePrevisionnelCard` | `data: dataQuality` | 4 barres de progression + score global |

Toutes utilisent `Card`/`CardHeader`/`CardContent` existants. Charts simples en CSS/div (pas de recharts pour ces petites visualisations).

## Étape 6 — Finitions

- Responsive : cards en une colonne sur mobile
- Animations cohérentes avec `motion.div` + `itemVariants` existants
- SessionStorage pour l'état collapsible

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/statia/shared/chargeTravauxEngine.ts` | Enrichi (interfaces + calculs, ~200 lignes ajoutées) |
| `src/statia/hooks/useChargeTravauxAVenir.ts` | Minimal (types déjà propagés) |
| `src/apogee-connect/components/stats-hub/tabs/PrevisionnelTab.tsx` | Enrichi (~30 lignes ajoutées, 0 supprimée) |
| `src/apogee-connect/components/stats-hub/previsionnel/PilotageAvanceSection.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/PipelineMaturityCard.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/PipelineAgingCard.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/RiskDossiersCard.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/ChargeTechnicienCard.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/ChargeSemaineCard.tsx` | Créé |
| `src/apogee-connect/components/stats-hub/previsionnel/FiabilitePrevisionnelCard.tsx` | Créé |

Aucun composant existant supprimé ni remplacé.

