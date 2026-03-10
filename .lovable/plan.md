

## Outil "Devis Acceptés" — Plan d'implémentation

### Objectif
Un nouvel outil dans l'onglet **Outils > Actions** (ou un sous-onglet dédié) qui affiche les dossiers avec devis acceptés, triables par montant, avec des filtres rapides.

### Source de données existante
- `DataService.loadAllData()` fournit déjà `devis`, `projects`, `clients`
- Un devis est "accepté" si `state === "accepted"` ou `state === "order"` ou `state === "invoice"`
- Le montant HT est dans `devis.totalHT` ou `devis.data?.totalHT`
- Chaque devis a un `projectId` pour lier au dossier et au client

### Architecture

1. **Hook `useDevisAcceptes`** (`src/apogee-connect/hooks/useDevisAcceptes.ts`)
   - Charge les données via `DataService.loadAllData()`
   - Filtre les devis acceptés, enrichit avec nom client, ref dossier, ville, univers
   - Agrège par dossier (un dossier peut avoir plusieurs devis acceptés → somme des montants)
   - Expose les filtres : univers, période, tri (montant croissant/décroissant)

2. **Composant `DevisAcceptesTable`** (`src/apogee-connect/components/DevisAcceptesTable.tsx`)
   - Table triable avec colonnes : Réf dossier, Client, Ville, Univers, Nb devis, Montant HT total, Date dernier devis
   - Tri par défaut : montant décroissant
   - Clic sur une ligne → ouvre `DossierDetailDialog` (existant)

3. **Composant `DevisAcceptesView`** (`src/apogee-connect/components/DevisAcceptesView.tsx`)
   - Card avec en-tête : total dossiers, montant total HT
   - Filtres chips : par univers, par période (mois en cours, trimestre, année)
   - Barre de recherche texte (ref, client)
   - Intègre la table

4. **Intégration dans DiversTabContent**
   - Ajout d'un nouvel onglet "Devis acceptés" dans les `MAIN_TABS_CONFIG` sous l'onglet Outils, ou comme sous-section de "Actions"
   - Module requis : `agence`
   - Lazy loaded

### Filtres prévus
- **Univers** : chips multi-select (amiante, plomb, etc.)
- **Période** : Mois / Trimestre / Année / Tout
- **Recherche texte** : ref dossier, nom client, ville
- **Tri** : Montant HT ↑↓, Date ↑↓, Client A-Z

### UI
- Réutilise le pattern existant de `ActionsAMenerTab` (chips filtres inline, Card, table)
- `formatEuros()` existant pour les montants
- `DossierDetailDialog` existant pour le détail au clic
- Pas de nouvelle table Supabase nécessaire — tout vient de l'API Apogée en mémoire

