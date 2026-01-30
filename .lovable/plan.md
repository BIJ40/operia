
# Plan de refonte : Page Diffusion TV

## Objectif
Refondre complètement la page Diffusion TV (`/diffusion`) pour qu'elle soit cohérente avec le thème visuel de l'onglet Stats, affiche les KPIs du mois en cours uniquement via StatIA, et propose un paramétrage de l'objectif CA avec une tile "Objectif restant".

---

## Architecture actuelle

```text
DiffusionDashboard.tsx
├── DiffusionBandeau.tsx (message motivant)
├── DiffusionKpiTiles.tsx (6 tiles basiques)
├── DiffusionSaviezVous.tsx (anecdotes)
├── DiffusionSlides.tsx → SlideCATechniciens.tsx (graphique barres)
└── DiffusionSettingsPanel.tsx (Sheet de paramétrage)
```

**Problèmes identifiés :**
- Design pas aligné avec le thème "Warm Pastel" de Stats
- Manque la tile "Objectif CA restant"
- Classement tech limité au Top 1 (demandé : TRIO + autres)
- Métriques incomplètes (manquent TOP 1 apporteur, TOP 1 domaine)
- Icône paramètres trop visible (doit disparaître en plein écran)

---

## Nouvelle architecture proposée

```text
DiffusionDashboard.tsx (refonte)
├── Header flottant (discret, masqué en fullscreen)
│   └── Bouton ⚙️ paramètres (semi-transparent)
│
├── Section 1 : KPI Tiles (grille 4×2)
│   ├── CA mois en cours
│   ├── Objectif restant à faire ← NOUVEAU
│   ├── Panier moyen
│   ├── Taux SAV
│   ├── Délai moyen facturation
│   ├── Nb dossiers
│   ├── TOP 1 Apporteur ← NOUVEAU
│   └── TOP 1 Domaine (Univers) ← NOUVEAU
│
├── Section 2 : Podium Techniciens ← NOUVEAU
│   ├── Trio gagnant (1er, 2e, 3e) avec médailles
│   └── Liste des autres techniciens (4e+)
│
└── Section 3 : Graphique CA/Tech 6 derniers mois
    └── Barres empilées (existant, conservé)
```

---

## Détail des modifications

### 1. Hook `useDiffusionKpisStatia.ts` - Extension

Ajouter les métriques manquantes :

| Métrique | Clé StatIA | Extraction |
|----------|-----------|------------|
| Panier moyen | `panier_moyen_global` | value |
| Délai moyen | `delai_moyen_facturation` | value |
| TOP apporteurs | `top_apporteurs_ca` | breakdown.ranking[0] |
| TOP univers | `ca_par_univers` | max(value) |
| Classement tech complet | `top_techniciens_ca` | breakdown.ranking (tous) |

**Calcul objectif restant :**
```typescript
const objectifRestant = Math.max(0, settings.objectif_amount - currentMonthCA);
```

---

### 2. Nouveau composant `DiffusionTechPodium.tsx`

Affichage du classement techniciens :
- **Trio gagnant** : 3 cards visuellement distinctes avec médailles 🥇🥈🥉
- **Autres techniciens** : grille compacte (4e au dernier)
- Chaque card montre : prénom, CA HT, couleur technicien

Design inspiré de `TechniciensTab.tsx` (Top 5 existant) mais adapté TV.

---

### 3. Refonte `DiffusionKpiTiles.tsx`

Passer de 6 à 8 tiles avec nouveau design :

| Tile | Données | Couleur bordure |
|------|---------|-----------------|
| CA mois | `currentMonthCA` | blue |
| Objectif restant | `objectif_amount - CA` | orange |
| Panier moyen | `panierMoyen` | purple |
| Taux SAV | `tauxSAV` | red |
| Délai moyen | `delaiMoyen` | teal |
| Nb dossiers | `nbDossiersRecus` | green |
| TOP Apporteur | `topApporteur.name` | pink |
| TOP Domaine | `topUnivers.name` | cyan |

Style aligné sur `GeneralTab.tsx` :
```tsx
<Card className="border-l-4 border-l-{color} bg-gradient-to-br from-{color}/10 to-background">
```

---

### 4. Modification `DiffusionSettingsPanel.tsx`

L'onglet "Objectif" existe déjà avec :
- `objectif_title` : ex "OBJECTIF JANVIER 2026"
- `objectif_amount` : ex 117000

Aucune modification nécessaire, le hook lit déjà ces valeurs.

---

### 5. Refonte `DiffusionDashboard.tsx`

**Header discret :**
```tsx
{!isFullscreen && (
  <Button
    onClick={handleSettingsOpen}
    className="fixed top-4 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity"
    size="icon"
    variant="ghost"
  >
    <Settings className="h-5 w-5" />
  </Button>
)}
```

**Layout principal :**
```tsx
<div className="min-h-screen bg-gradient-to-br from-background via-warm-blue/5 to-warm-pink/5">
  <DiffusionKpiTiles settings={settings} />
  <DiffusionTechPodium />
  <SlideCATechniciens currentMonthIndex={currentMonth} />
</div>
```

---

### 6. Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `src/components/diffusion/useDiffusionKpisStatia.ts` | Modifier - ajouter métriques |
| `src/components/diffusion/DiffusionKpiTiles.tsx` | Modifier - 8 tiles + nouveau design |
| `src/components/diffusion/DiffusionTechPodium.tsx` | Créer - podium + liste |
| `src/pages/DiffusionDashboard.tsx` | Modifier - layout + bouton discret |
| `src/components/diffusion/DiffusionBandeau.tsx` | Optionnel - supprimer si encombrant |
| `src/components/diffusion/DiffusionSaviezVous.tsx` | Conserver tel quel |

---

## Détail technique

### Hook étendu `useDiffusionKpisStatia.ts`

```typescript
const [
  caResult,
  savResult,
  caMoyenResult,
  topTechResult,
  dossiersResult,
  caJourResult,
  panierResult,       // NOUVEAU
  delaiResult,        // NOUVEAU
  topApporteursResult, // NOUVEAU
  caUniversResult,    // NOUVEAU
] = await Promise.all([
  getMetricForAgency('ca_global_ht', ...),
  getMetricForAgency('taux_sav_global', ...),
  getMetricForAgency('ca_moyen_par_tech', ...),
  getMetricForAgency('top_techniciens_ca', ...),
  getMetricForAgency('nb_dossiers_crees', ...),
  getMetricForAgency('ca_moyen_par_jour', ...),
  getMetricForAgency('panier_moyen_global', ...),    // NOUVEAU
  getMetricForAgency('delai_moyen_facturation', ...), // NOUVEAU
  getMetricForAgency('top_apporteurs_ca', ...),      // NOUVEAU
  getMetricForAgency('ca_par_univers', ...),         // NOUVEAU
]);

// Extraction TOP 1 apporteur
const topApporteursRanking = (topApporteursResult.breakdown as any)?.ranking || [];
const topApporteur = topApporteursRanking[0] 
  ? { name: topApporteursRanking[0].id, ca: Object.values(topApporteursResult.value)[0] }
  : null;

// Extraction TOP 1 univers
const universValues = caUniversResult.value as Record<string, number>;
const topUnivers = Object.entries(universValues)
  .sort((a, b) => b[1] - a[1])[0];

// Classement tech complet
const allTechRanking = (topTechResult.breakdown as any)?.ranking || [];
```

---

## Résumé visuel attendu

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚙️ (discret)                                                        │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│ CA Janv │Objectif │ Panier  │Taux SAV │ Délai   │Dossiers │TOP App  │TOP Dom │
│ 85 000€ │-32 000€ │ 1 450€  │  2,3%   │  18j    │   58    │MAIF     │Plomberie│
├─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┤
│                                                                              │
│     🥈            🥇            🥉                                           │
│   JULIEN        MARC         THOMAS         + autres techs en grille        │
│   18 500€      23 200€       15 800€                                         │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│           📊 Évolution CA par Technicien (6 mois)                            │
│   ████████████████████████                                                   │
│   Jan  Fév  Mar  Avr  Mai  Juin                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Ordre d'implémentation

1. Étendre `useDiffusionKpisStatia.ts` avec les nouvelles métriques
2. Créer `DiffusionTechPodium.tsx` (podium + liste)
3. Refondre `DiffusionKpiTiles.tsx` (8 tiles, nouveau design)
4. Modifier `DiffusionDashboard.tsx` (layout + bouton discret)
5. Tester en mode plein écran (bouton doit disparaître)
