# Documentation Technique - Module Apogee Connect

## Vue d'ensemble

Le module **Apogee Connect** est un système de reporting et d'analyse de données métier intégré au projet Guide Apogée. Il permet de visualiser des indicateurs clés de performance (KPI) en temps réel à partir de l'API HC-Apogée, avec des fonctionnalités de filtrage temporel et de segmentation avancées.

**Technologies utilisées:**
- React 18 + TypeScript
- TanStack Query (React Query) pour la gestion du cache
- Recharts pour les visualisations
- Date-fns pour la manipulation des dates
- Tailwind CSS pour le design

---

## Architecture du module

### Structure des dossiers

```
src/apogee-connect/
├── components/
│   ├── filters/              # Composants de sélection de période
│   │   ├── PeriodSelector.tsx
│   │   └── SecondaryPeriodSelector.tsx
│   ├── layout/               # Structure et navigation
│   │   ├── AppLayout.tsx
│   │   └── IndicateursSidebar.tsx
│   └── widgets/              # Widgets de visualisation KPI
│       ├── ActivityChart.tsx
│       ├── ChartCard.tsx
│       ├── DossiersConfiesWidget.tsx
│       ├── DuGlobalWidget.tsx
│       ├── FlopApporteursWidget.tsx
│       ├── MetricCard.tsx
│       ├── MonthlyCAChart.tsx
│       ├── ParticuliersWidget.tsx
│       ├── PipelineChart.tsx
│       ├── SegmentationChart.tsx
│       ├── TopApporteursWidget.tsx
│       ├── TypesApporteursWidget.tsx
│       └── WidgetDialog.tsx
├── contexts/                 # Gestion d'état global
│   ├── AgencyContext.tsx
│   ├── ApiToggleContext.tsx
│   ├── FiltersContext.tsx
│   └── SecondaryFiltersContext.tsx
├── pages/                    # Pages principales
│   ├── Dashboard.tsx
│   ├── IndicateursAccueil.tsx
│   ├── IndicateursApporteurs.tsx
│   ├── IndicateursLayout.tsx
│   ├── IndicateursTechniciens.tsx
│   └── IndicateursUnivers.tsx
├── services/                 # Couche d'accès aux données
│   ├── api.ts
│   ├── dataService.ts
│   └── enrichmentService.ts
├── types/                    # Définitions TypeScript
│   └── index.ts
└── utils/                    # Fonctions de calcul métier
    ├── activityCalculations.ts
    ├── apporteursCalculations.ts
    ├── dashboardCalculations.ts
    ├── formatters.ts
    ├── monthlyCalculations.ts
    ├── particuliersCalculations.ts
    ├── pipelineCalculations.ts
    ├── segmentationCalculations.ts
    └── typesApporteursCalculations.ts
```

---

## Contextes React

### AgencyContext

**Rôle:** Gère l'agence active de l'utilisateur connecté et configure l'URL de base de l'API.

**Fonctionnement:**
1. Récupère le champ `agence` depuis le profil utilisateur (`profiles.agence`)
2. Construit dynamiquement l'URL de l'API: `https://{agence}.hc-apogee.fr/api/`
3. Appelle `setApiBaseUrl()` pour configurer le service API
4. Vide le cache DataService lors du changement d'agence

**Sécurité critique:**
- **JAMAIS** hardcoder d'URL d'agence dans le code
- Toujours utiliser `profile.agence` pour construire l'URL
- Évite les fuites de données entre agences

```typescript
// ✅ CORRECT - URL dynamique basée sur le profil
const currentAgency = agence 
  ? {
      id: agence,
      name: agence,
      baseUrl: `https://${agence}.hc-apogee.fr/api/`
    }
  : null;
```

### ApiToggleContext

**Rôle:** Permet de basculer entre données réelles (API) et données de démonstration (JSON local).

**États:**
- `isApiEnabled: boolean` - Utilise l'API Apogée si `true`, sinon données JSON

**Usage:** Utile pour le développement et les tests sans connexion API.

### FiltersContext (Période principale)

**Rôle:** Gère le filtre temporel principal appliqué aux KPI du dashboard d'accueil.

**États:**
- `filters.dateRange: { start: Date, end: Date }` - Plage de dates active
- `filters.periodLabel: string` - Label de la période ("aujourd'hui", "7 derniers jours", etc.)

**Périodes supportées:**
- Aujourd'hui (Jour)
- 7 derniers jours
- Mois en cours
- Année en cours
- 12 mois glissants

### SecondaryFiltersContext (Période secondaire)

**Rôle:** Gère un second filtre temporel indépendant, utilisé pour les pages sectorielles (Apporteurs, Univers, Techniciens).

**Utilité:** Permet d'analyser des données sur une période différente de celle du dashboard principal.

---

## Services

### api.ts - Couche d'accès API

**Configuration:**

```typescript
const API_KEY = import.meta.env.VITE_APOGEE_API_KEY;
let BASE_URL = ""; // Défini dynamiquement par AgencyContext
```

**⚠️ Sécurité:**
- La clé API est stockée dans une variable d'environnement (`VITE_APOGEE_API_KEY`)
- **JAMAIS** hardcoder la clé API dans le code source
- L'URL de base est définie dynamiquement par `setApiBaseUrl()`

**Endpoints disponibles:**

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `getUsers()` | `/apiGetUsers` | Récupère les utilisateurs/techniciens |
| `getClients()` | `/apiGetClients` | Récupère les clients |
| `getProjects()` | `/apiGetProjects` | Récupère les projets/dossiers |
| `getInterventions()` | `/apiGetInterventions` | Récupère les interventions |
| `getFactures()` | `/apiGetFactures` | Récupère les factures |
| `getDevis()` | `/apiGetDevis` | Récupère les devis |
| `getInterventionsCreneaux()` | `/getInterventionsCreneaux` | Récupère les créneaux d'intervention |

**Format de requête:**

Toutes les requêtes utilisent:
- Méthode: `POST`
- Content-Type: `application/json`
- Body: `{ API_KEY, ...additionalData }`

### dataService.ts - Gestion du cache

**Rôle:** Service centralisé pour charger et mettre en cache les données de l'API.

**Fonctionnalités:**
- Cache en mémoire des données chargées
- Méthode `loadAllData()` pour récupérer toutes les données nécessaires
- Méthode `clearCache()` pour vider le cache (lors du changement d'agence)
- Support du mode démo (données JSON locales)

**Données chargées:**

```typescript
interface AllData {
  users: User[];
  clients: Client[];
  projects: Project[];
  interventions: Intervention[];
  factures: Facture[];
  devis: Devis[];
  creneaux: Creneau[];
}
```

**Enrichissement automatique:**

Après chargement, les données sont enrichies via `EnrichmentService`:
1. Création de référentiels (techniciens, clients, univers)
2. Ajout de métadonnées calculées

### enrichmentService.ts - Enrichissement des données

**Rôle:** Crée des référentiels optimisés pour accélérer les calculs.

**Référentiels créés:**

1. **Techniciens** (`mapTechniciens`):
   - Map `userId` → `{ nom, prenom, actif }`
   - Utilisé pour les calculs par technicien

2. **Clients** (`mapClients`):
   - Map `clientId` → `{ displayName, type, commanditaireId }`
   - Distingue clients directs vs apporteurs

3. **Univers** (`mapUnivers`):
   - Map `projectId` → `string[]` (liste des univers)
   - Utilisé pour la segmentation par univers

**Optimisation:**
- Évite les boucles imbriquées lors des calculs
- Accès O(1) aux métadonnées via Map

---

## Règles métier critiques

### 1. Segmentation Apporteurs vs Particuliers

**Définitions:**

| Type | Définition | Identifiant |
|------|-----------|-------------|
| **Particulier** | Client direct sans intermédiaire | `!project.commanditaireId` |
| **Apporteur** | Client apporté par un tiers | `!!project.commanditaireId` |

**Implémentation:**

```typescript
// Fonction utilitaire
export const isParticulier = (project: any): boolean => {
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !commanditaireId; // Pas d'apporteur = client direct
};

export const isApporteur = (project: any): boolean => {
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !!commanditaireId; // Apporteur associé
};
```

**Impact sur les calculs:**
- Le CA est réparti entre les deux segments
- Les KPI (panier moyen, taux de transformation) sont calculés séparément
- Les graphiques de segmentation montrent l'évolution mensuelle

### 2. Factures d'initialisation (CRITIQUE)

**Contexte:**

En janvier 2025, une facture spéciale de régularisation a été créée pour initialiser les soldes comptables. Cette facture doit être traitée différemment des factures normales.

**Identification:**

```typescript
export const isInitInvoice = (facture: any, client?: any, project?: any): boolean => {
  // Client fictif + numéro de facture spécifique
  if ((client?.displayName?.includes("z_fake") || client?.nom?.includes("z_fake")) &&
      (facture.reference === "MNFA250100001" || facture.numeroFacture === "MNFA250100001")) {
    return true;
  }
  return false;
};
```

**Traitement spécial:**

La facture d'initialisation contient un montant global qui doit être réparti:

| Segment | Montant fixe |
|---------|--------------|
| **Particuliers** | 19 419,94 € |
| **Apporteurs** | Montant total - 19 419,94 € |

```typescript
// Constantes
export const INIT_INVOICE_PARTICULIERS = 19419.94;

export const getInitInvoiceApporteursAmount = (facture: any): number => {
  const montantTotal = parseFloat(String(facture.totalHT).replace(/[^0-9.-]/g, ''));
  const partApporteurs = montantTotal - INIT_INVOICE_PARTICULIERS;
  return Math.max(0, partApporteurs);
};
```

**⚠️ Règles impératives:**
1. **TOUJOURS** détecter et traiter cette facture spécialement
2. **NE JAMAIS** l'exclure totalement des calculs de CA
3. Répartir le montant selon les constantes définies
4. Appliquer cette logique dans TOUS les calculs de CA (global, par segment, par apporteur)

### 3. Calcul du CA (Chiffre d'affaires)

**Champs de date à utiliser:**

| Type | Champ prioritaire | Fallback |
|------|-------------------|----------|
| Factures | `dateEmission` | `dateReelle`, `created_at` |
| Devis | `dateReelle` | `dateEmission`, `created_at` |
| Projets | `createdAt` | `date` |
| Interventions | `date` | `dateIntervention`, `created_at` |

**Traitement des avoirs:**

```typescript
const typeFacture = facture.typeFacture || facture.data?.type || facture.state;

if (typeFacture === "avoir") {
  caTotal -= Math.abs(montant); // Soustraire le montant
} else {
  caTotal += montant; // Ajouter le montant
}
```

**Exclusions:**
- Factures avec montant invalide (`isNaN(montant)`)
- Factures hors période (filtre date)
- Factures d'initialisation comptabilisées selon les règles de répartition

### 4. Identification des types d'intervention

**RT (Relevé Technique):**

```typescript
export const isRT = (intervention: any): boolean => {
  // Vérifier type2
  if (intervention.type2?.toLowerCase().includes("relevé technique")) return true;
  
  // Vérifier data.biRt
  if (intervention.data?.biRt || intervention.data?.isRT) return true;
  
  return false;
};
```

**Dépannage:**

```typescript
export const isDepannage = (intervention: any): boolean => {
  // Vérifier type/type2
  if (intervention.type?.toLowerCase().includes("dépannage")) return true;
  
  // Vérifier data.biDepan avec travaux réalisés
  if (intervention.data?.biDepan?.items?.some(item => item.isWorkDone)) return true;
  
  return false;
};
```

**SAV (Service Après-Vente):**

```typescript
export const isSav = (intervention: any): boolean => {
  // Vérifier type/type2
  if (intervention.type?.toLowerCase().includes("sav")) return true;
  
  // Vérifier history
  if (intervention.data?.history?.some(h => h.labelKind?.toLowerCase().includes("sav"))) {
    return true;
  }
  
  return false;
};
```

---

## Calculs de KPI

### KPI Dashboard principal

**1. Dossiers reçus (période)**

```typescript
export const calculateDossiersJour = (projects: any[], dateRange: { start: Date; end: Date }): number => {
  return projects.filter(project => {
    const dateCreation = project.created_at || project.date;
    const projectDate = parseISO(dateCreation);
    return isWithinInterval(projectDate, { start: dateRange.start, end: dateRange.end });
  }).length;
};
```

**2. RT réalisés (période)**

```typescript
export const calculateRtJour = (interventions: any[], dateRange: { start: Date; end: Date }): { nbRT: number; heuresRT: number } => {
  let nbRT = 0;
  let heuresRT = 0;
  
  interventions.forEach(intervention => {
    const interventionDate = parseISO(intervention.date);
    if (isWithinInterval(interventionDate, dateRange) && isRT(intervention)) {
      nbRT++;
      const heures = intervention.data?.biRt?.duree || 0;
      heuresRT += parseFloat(heures);
    }
  });
  
  return { nbRT, heuresRT };
};
```

**3. Devis émis (période)**

```typescript
export const calculateDevisJour = (devis: any[], dateRange: { start: Date; end: Date }): { nbDevis: number; caDevis: number } => {
  let nbDevis = 0;
  let caDevis = 0;
  
  devis.forEach(d => {
    const devisDate = parseISO(d.dateReelle || d.dateEmission);
    if (isWithinInterval(devisDate, dateRange)) {
      nbDevis++;
      const montant = parseFloat(String(d.totalHT).replace(/[^0-9.-]/g, ''));
      if (!isNaN(montant)) caDevis += montant;
    }
  });
  
  return { nbDevis, caDevis };
};
```

**4. CA période**

Voir section "Calcul du CA" ci-dessus pour les détails complets.

**5. Taux de SAV**

```typescript
export const calculateTauxSAVGlobal = (
  interventions: any[], 
  factures: any[], 
  projects: any[], 
  clients: any[], 
  dateRange: { start: Date; end: Date }
): number => {
  // Dossiers totaux avec interventions facturées
  const dossiersTotaux = new Set<number>();
  const dossiersSAV = new Set<number>();
  
  interventions.forEach(intervention => {
    if (isWithinInterval(parseISO(intervention.date), dateRange)) {
      dossiersTotaux.add(intervention.projectId);
      if (isSav(intervention)) {
        dossiersSAV.add(intervention.projectId);
      }
    }
  });
  
  const nbTotal = dossiersTotaux.size;
  const nbSAV = dossiersSAV.size;
  
  return nbTotal > 0 ? (nbSAV / nbTotal) * 100 : 0;
};
```

### Variations temporelles

**Principe:**

Les variations comparent la période actuelle (N) à la période précédente équivalente (N-1).

```typescript
export const calculateVariationDossiers = (projects: any[], dateRange: { start: Date; end: Date }): number => {
  const dossiersActuel = calculateDossiersJour(projects, dateRange);
  
  // Calculer période N-1
  const periodeDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const previousStart = subDays(dateRange.start, periodeDays);
  const previousEnd = subDays(dateRange.end, periodeDays);
  
  const dossiersPrecedent = calculateDossiersJour(projects, { start: previousStart, end: previousEnd });
  
  if (dossiersPrecedent === 0) return dossiersActuel > 0 ? 100 : 0;
  
  return Math.round(((dossiersActuel - dossiersPrecedent) / dossiersPrecedent) * 100);
};
```

**⚠️ Important:**
- Les variations RT et Devis sont actuellement en `null` (non implémentées)
- Afficher "N/A" dans l'UI au lieu de "0%" pour éviter la confusion

### KPI Apporteurs

**1. Top 10 Apporteurs (CA)**

```typescript
export const calculateTop10Apporteurs = (
  factures: any[], 
  projects: any[], 
  devis: any[], 
  clients: any[], 
  dateRange: { start: Date; end: Date }
): ApporteurStat[] => {
  // Filtrer factures de la période pour APPORTEURS uniquement
  const facturesApporteurs = factures.filter(facture => {
    const project = projects.find(p => p.id === facture.projectId);
    return project && isApporteur(project);
  });
  
  // Agréger CA par apporteur
  const apporteursMap = new Map<string, number>();
  
  facturesApporteurs.forEach(facture => {
    const project = projects.find(p => p.id === facture.projectId);
    const apporteurId = project?.commanditaireId;
    
    if (apporteurId) {
      const montant = parseFloat(String(facture.totalHT).replace(/[^0-9.-]/g, ''));
      apporteursMap.set(apporteurId, (apporteursMap.get(apporteurId) || 0) + montant);
    }
  });
  
  // Trier et prendre top 10
  return Array.from(apporteursMap.entries())
    .map(([id, ca]) => ({ apporteurId: id, ca }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 10);
};
```

**2. Dossiers confiés par apporteur**

Compte le nombre de projets créés dans la période pour chaque apporteur.

**3. Dû global**

Somme des factures émises mais non encore encaissées.

**4. Taux de transformation**

```typescript
export const calculateTauxTransformationMoyen = (
  devis: any[], 
  factures: any[], 
  projects: any[], 
  clients: any[], 
  dateRange: { start: Date; end: Date }
): number => {
  const facturesSet = new Set(factures.map(f => f.projectId));
  
  let devisTotal = 0;
  let devisTransformes = 0;
  
  devis.forEach(d => {
    if (isWithinInterval(parseISO(d.dateReelle), dateRange)) {
      devisTotal++;
      if (d.state === "accepted" || facturesSet.has(d.projectId)) {
        devisTransformes++;
      }
    }
  });
  
  return devisTotal > 0 ? (devisTransformes / devisTotal) * 100 : 0;
};
```

**5. Panier moyen HT**

```typescript
export const calculatePanierMoyenHT = (
  factures: any[], 
  projects: any[], 
  clients: any[], 
  dateRange: { start: Date; end: Date }
): number => {
  const { caTotal } = calculateCaJour(factures, clients, projects, dateRange);
  const nbDossiers = new Set(factures.map(f => f.projectId)).size;
  
  return nbDossiers > 0 ? caTotal / nbDossiers : 0;
};
```

### Graphiques mensuels

**1. CA mensuel (12 mois)**

```typescript
export const calculateMonthlyCA = (
  factures: any[], 
  clients: any[], 
  projects: any[], 
  year: number // ⚠️ ANNÉE DYNAMIQUE
): MonthlyCA[] => {
  const monthlyData: MonthlyCA[] = [];
  
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthLabel = format(date, "MMM", { locale: fr });
    
    const { caTotal, nbFactures } = calculateCaJour(factures, clients, projects, { 
      start: monthStart, 
      end: monthEnd 
    });
    
    monthlyData.push({ month: monthLabel, ca: caTotal, nbFactures });
  }
  
  return monthlyData;
};
```

**⚠️ Important:**
- L'année est maintenant **dynamique** et basée sur les filtres actifs
- Récupère l'année depuis `filters.dateRange.start.getFullYear()`
- Fallback sur l'année courante si pas de filtre

**2. Segmentation mensuelle Particuliers/Apporteurs**

```typescript
export const calculateMonthlySegmentation = (
  factures: any[], 
  clients: any[], 
  projects: any[], 
  year: number // ⚠️ ANNÉE DYNAMIQUE
): MonthlySegmentData[] => {
  const monthlyData: MonthlySegmentData[] = [];
  
  for (let month = 0; month < 12; month++) {
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    
    let caParticuliers = 0;
    let caApporteurs = 0;
    
    factures.forEach(facture => {
      if (isWithinInterval(parseISO(facture.dateEmission), { start: monthStart, end: monthEnd })) {
        const project = projects.find(p => p.id === facture.projectId);
        const montant = parseFloat(String(facture.totalHT).replace(/[^0-9.-]/g, ''));
        
        if (isParticulier(project)) {
          caParticuliers += montant;
        } else if (isApporteur(project)) {
          caApporteurs += montant;
        }
      }
    });
    
    const totalCA = caParticuliers + caApporteurs;
    
    monthlyData.push({
      month: format(new Date(year, month, 1), "MMM", { locale: fr }),
      caParticuliers,
      caApporteurs,
      totalCA,
      partParticuliers: totalCA > 0 ? (caParticuliers / totalCA) * 100 : 0,
      partApporteurs: totalCA > 0 ? (caApporteurs / totalCA) * 100 : 0
    });
  }
  
  return monthlyData;
};
```

---

## Gestion des logs

**Mode développement:**

Tous les logs de debug sont encapsulés dans une condition:

```typescript
if (import.meta.env.DEV) {
  console.log("💶 calculateCaJour - entrée", { nbFactures: factures.length });
}
```

**Avantages:**
- Logs visibles en développement pour le debug
- Automatiquement supprimés en production (build)
- Pas de spam console en production

**Icônes utilisées pour la clarté:**
- 💶 = Calculs CA
- 📊 = Statistiques
- 🔍 = Filtrage
- ✅ = Succès
- ⚠️ = Avertissement
- ❌ = Erreur

---

## Pages et navigation

### Structure de navigation

```
/mes-indicateurs (IndicateursLayout)
├── /mes-indicateurs (IndicateursAccueil) - Page d'accueil avec 12 KPI + graphique CA
├── /mes-indicateurs/apporteurs (IndicateursApporteurs) - Analyse détaillée apporteurs
├── /mes-indicateurs/univers (IndicateursUnivers) - Répartition par univers métier
└── /mes-indicateurs/techniciens (IndicateursTechniciens) - Performance par technicien
```

### IndicateursLayout

Wrapper principal qui fournit:
- `ApiToggleProvider` - Toggle API réelle/démo
- `AgencyProvider` - Gestion de l'agence active
- `FiltersProvider` - Filtre temporel principal
- `SecondaryFiltersProvider` - Filtre temporel secondaire
- `IndicateursSidebar` - Navigation latérale

### IndicateursAccueil

**KPI affichés (12 tuiles):**
1. Dossiers reçus + variation %
2. RT réalisés + heures
3. Devis émis + CA devis
4. CA période + variation %
5. Taux de SAV
6-12. Placeholders pour futurs KPI

**Graphiques:**
- CA mensuel (année dynamique basée sur filtre principal)

### IndicateursApporteurs

**KPI affichés (5 cartes):**
1. Dû global TTC
2. Dossiers confiés
3. Taux de transformation
4. Panier moyen HT
5. Délai moyen de facturation

**Widgets:**
- Top 10 apporteurs (tableau)
- Flop 10 apporteurs (plus de dû)
- Types d'apporteurs (pie chart)
- Particuliers vs Apporteurs (stats comparatives)
- Segmentation mensuelle (courbe)
- Dû global par apporteur (tableau)

---

## Types TypeScript principaux

### Entités de base

```typescript
export interface User {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  active: boolean;
}

export interface Client {
  id: number;
  displayName: string;
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  commanditaireId?: number; // ID apporteur si client apporté
}

export interface Project {
  id: number;
  clientId: number;
  status: string;
  createdAt: string;
  commanditaireId?: number; // Détermine si apporteur ou particulier
  data?: {
    universes?: string[];
    commanditaireId?: number;
  };
}

export interface Intervention {
  id: number;
  projectId: number;
  date: string;
  type?: string;
  type2?: string;
  status: string;
  data?: {
    biRt?: any;
    biDepan?: any;
    biTvx?: any;
    isRT?: boolean;
  };
}

export interface Facture {
  id: number;
  projectId: number;
  clientId: number;
  dateEmission?: string;
  dateReelle?: string;
  reference?: string;
  numeroFacture?: string;
  totalHT?: string | number;
  typeFacture?: string; // "facture" ou "avoir"
  state?: string;
  data?: {
    totalHT?: string | number;
    type?: string;
    isInit?: boolean;
  };
}

export interface Devis {
  id: number;
  projectId: number;
  dateReelle?: string;
  dateEmission?: string;
  totalHT?: string | number;
  state?: string; // "draft", "sent", "accepted", "invoice"
  numero?: string;
}
```

### Statistiques calculées

```typescript
export interface ApporteurStat {
  apporteurId: string;
  apporteurLabel: string;
  typeApporteur?: string;
  ca: number;
  nbDossiers: number;
  nbDevis?: number;
  nbFactures?: number;
}

export interface MonthlyCA {
  month: string; // "Jan", "Fev", etc.
  ca: number;
  nbFactures: number;
}

export interface MonthlySegmentData {
  month: string;
  caParticuliers: number;
  caApporteurs: number;
  totalCA: number;
  partParticuliers: number; // Pourcentage
  partApporteurs: number;   // Pourcentage
}

export interface DashboardStats {
  dossiersJour: number;
  rtJour: number;
  heuresRT: number;
  devisJour: number;
  caDevis: number;
  caJour: number;
  nbFacturesCA: number;
  variations: {
    dossiers: number;
    rt: number | null;    // null = non implémenté
    devis: number | null; // null = non implémenté
    ca: number;
  };
}
```

---

## Bonnes pratiques

### 1. Sécurité

✅ **À faire:**
- Utiliser `import.meta.env.VITE_APOGEE_API_KEY` pour la clé API
- Toujours construire l'URL depuis `profile.agence`
- Valider les données API avant utilisation

❌ **À éviter:**
- Hardcoder la clé API dans le code
- Hardcoder une URL d'agence spécifique
- Faire confiance aux données API sans validation

### 2. Performance

✅ **À faire:**
- Utiliser TanStack Query pour le cache
- Créer des référentiels Map pour les lookups O(1)
- Filtrer les données côté client après chargement

❌ **À éviter:**
- Recharger toutes les données à chaque changement
- Boucles imbriquées sur de gros volumes
- Calculs redondants sans mémoïsation

### 3. Maintenance

✅ **À faire:**
- Encapsuler les logs dans `import.meta.env.DEV`
- Documenter les règles métier complexes
- Utiliser des constantes pour les valeurs magiques
- Typage TypeScript strict

❌ **À éviter:**
- Logs verbeux en production
- Valeurs magiques dispersées dans le code
- Code sans commentaires pour la logique métier

### 4. Dates

✅ **À faire:**
- Utiliser `date-fns` pour toutes les manipulations
- Parser avec `parseISO()` systématiquement
- Gérer les formats multiples (ISO, DD/MM/YYYY)
- Fallback sur plusieurs champs de date

❌ **À éviter:**
- Manipulation native des dates JS
- Supposer un format de date unique
- Ignorer les fuseaux horaires

---

## Dépannage

### Les données ne s'affichent pas

**Vérifications:**
1. `BASE_URL` est-elle définie ? Vérifier `AgencyContext`
2. Le profil utilisateur contient-il `profile.agence` ?
3. La clé API `VITE_APOGEE_API_KEY` est-elle dans `.env` ?
4. L'utilisateur a-t-il les permissions `mes_indicateurs` ?

### Les KPI sont à zéro

**Vérifications:**
1. Vérifier les champs de date utilisés dans les filtres
2. Logs de développement activés ? Vérifier la console
3. Les données API sont-elles valides ? Tester en mode démo
4. La période sélectionnée contient-elle des données ?

### Erreur "Cannot read property of undefined"

**Causes probables:**
1. Données API manquantes ou mal structurées
2. Référentiel non initialisé (EnrichmentService)
3. Accès à un champ sans vérification `?.`

**Solution:**
- Ajouter des guards: `if (!data) return defaultValue;`
- Utiliser optional chaining: `object?.property`

### Performance dégradée

**Optimisations:**
1. Vérifier le cache TanStack Query
2. Réduire les recalculs inutiles (mémoïsation)
3. Paginer les gros tableaux
4. Lazy loading des composants lourds

---

## Évolutions futures

### KPI non implémentés

**Variations RT et Devis:**
- Actuellement en `null`
- À implémenter selon la même logique que la variation Dossiers

**KPI placeholders (6-12):**
- Taux de satisfaction client
- Délai moyen d'intervention
- Taux d'occupation techniciens
- CA par univers
- etc.

### Fonctionnalités planifiées

1. **Export Excel/PDF**
   - Export des tableaux de données
   - Génération de rapports PDF

2. **Comparaisons multi-périodes**
   - Comparer N vs N-1, N vs N-2
   - Graphiques d'évolution longue durée

3. **Alertes intelligentes**
   - Notifications si KPI en baisse
   - Seuils configurables par agence

4. **Dashboard personnalisable**
   - Drag & drop des widgets
   - Configuration par utilisateur

---

## Support et maintenance

**Contact technique:**
- Documentation projet: `ARCHITECTURE.md`
- Issues GitHub: [lien vers le repo]

**Logs et debugging:**
- Activer le mode développement: `npm run dev`
- Logs de debug affichés dans la console
- Utiliser React Query Devtools pour inspecter le cache

**Tests:**
- Mode démo disponible via `ApiToggleContext`
- Données de test dans `src/data/apogee-data.json`

---

## Changelog

### v2.0.0 (2025-01-25)
- ✅ Intégration du mini-projet apogee-connect
- ✅ Sécurisation de la clé API (variable d'environnement)
- ✅ Année dynamique pour les graphiques mensuels
- ✅ Gestion des variations RT/Devis (null)
- ✅ Nettoyage des fichiers inutiles
- ✅ Encapsulation des logs en mode développement

### v1.0.0 (2024-12-01)
- 🎉 Version initiale du module apogee-connect
- Connexion API HC-Apogée
- 12 KPI principaux
- Segmentation Apporteurs/Particuliers
- Graphiques mensuels

---

**Document rédigé le:** 2025-01-25  
**Version:** 2.0.0  
**Auteur:** Équipe technique Guide Apogée
