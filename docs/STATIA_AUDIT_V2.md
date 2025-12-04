# AUDIT STATIA V2 - Rapport Complet

## 1. CARTOGRAPHIE DES STATISTIQUES EXISTANTES

### 1.1 Module Agence (`src/apogee-connect/utils/`)

| Fichier | Métriques | Classe | Notes |
|---------|-----------|--------|-------|
| `dashboardCalculations.ts` | CA jour, Dossiers jour, RT jour, Devis jour, Délai moyen, Variations | **A** | Utilise `extractFactureMeta()`, conforme STATIA_RULES |
| `universCalculations.ts` | CA par univers, CA mensuel par univers, Taux SAV par univers | **A** | Normalisation univers OK, avoirs en négatif |
| `apporteursCalculations.ts` | CA par apporteur, Matrix univers×apporteur | **A** | Conforme |
| `recouvrementCalculations.ts` | Recouvrement global, par client, par projet | **A** | Gestion avoirs correcte |
| `savCalculations.ts` | Taux SAV, SAV par technicien | **A** | Conforme |
| `technicienUniversEngine.ts` | CA tech×univers, Productivité | **A** | Référence unique, utilise `extractFactureMeta()` |

### 1.2 Module Franchiseur (`src/franchiseur/utils/`)

| Fichier | Métriques | Classe | Notes |
|---------|-----------|--------|-------|
| `networkCalculations.ts` | TOP 5 agences, Meilleur apporteur | **B** | ⚠️ Exclut avoirs au lieu de soustraire |
| `networkCalculations.ts` | CA mensuel réseau | **B** | ⚠️ Même problème avoirs |
| `networkCalculations.ts` | SAV réseau | **A** | Conforme |
| `networkCalculations.ts` | Royalties mensuelles | **C** | Placeholder non implémenté |

### 1.3 StatIA V1 Existant (`src/statia/`)

| Fichier | Métriques | État |
|---------|-----------|------|
| `definitions/ca.ts` | ca_global_ht, ca_par_mois, du_client, panier_moyen | ✅ Complet |
| `definitions/univers.ts` | ca_par_univers, ca_mensuel_par_univers | ✅ Complet |
| `definitions/apporteurs.ts` | ca_par_apporteur | ✅ Complet |
| `definitions/techniciens.ts` | ca_par_technicien_univers | ✅ Complet |
| `definitions/sav.ts` | taux_sav_global | ✅ Complet |
| `definitions/devis.ts` | taux_transformation_devis | ✅ Complet |
| `definitions/recouvrement.ts` | taux_recouvrement | ✅ Complet |

---

## 2. CLASSIFICATION A/B/C

### Classe A (80%) - Réutilisables tels quels
- `extractFactureMeta()` → Helper centralisé parfait
- `technicienUniversEngine.ts` → Moteur de référence
- `calculateUniversStats()` → OK
- `calculateRecouvrement()` → OK
- `calculateDashboardStats()` → OK

### Classe B (15%) - Corrections mineures nécessaires
- `calculateTop5Agencies()` → Exclut avoirs (devrait soustraire)
- `calculateBestApporteur()` → Même problème
- `calculateMonthlyCAEvolution()` → Même problème

### Classe C (5%) - À réécrire
- `calculateMonthlyRoyalties()` → Placeholder vide

---

## 3. RÈGLES MÉTIER À INTÉGRER

### 3.1 Structure Dossiers Apogée
```
1 client → 1..n dossiers
1 dossier → n RDV (interventions)
1 dossier → n devis
1 dossier → 1 facture finale
```

### 3.2 Relevés Techniques (RT)
- **RT Standard**: Chiffrage simple
- **RT Complexe**: Dégât des eaux (structure imposée: pièce, surface, m² endommagé)
- **RT Complémentaire**: Autorisé depuis 06/06
- Détection RT sans devis → suggérer génération

### 3.3 SAV (Service Après-Vente)
- **SAV Interne**: Coût qualité supporté
- **SAV Refacturé**: Refacturation client
- Rattachement au technicien d'origine (même si autre exécute)
- Impacts: taux SAV, coût qualité, CA dégradé

### 3.4 Univers Métier
- Canonisation: `amelioration_logement` → `pmr`
- Exclus du cœur: `mobilier`, `travaux_exterieurs`

---

## 4. NOUVELLES FAMILLES DE MÉTRIQUES

### 4.1 Famille "Dossier"
| ID | Label | Formule |
|----|-------|---------|
| `duree_moyenne_dossier` | Durée moyenne dossier | avg(date_facture - date_creation) |
| `duree_mediane_dossier` | Durée médiane dossier | median(durées) |
| `taux_multi_visites` | Taux dossiers multi-visites | count(dossiers >1 visite) / total |
| `nb_rt_par_dossier` | Nb RT moyen par dossier | count(RT) / count(dossiers) |
| `taux_rt_complementaire` | Taux RT complémentaire | count(RT complémentaire) / total RT |
| `taux_degats_eaux` | % dossiers dégâts des eaux | count(DDE) / total |

### 4.2 Famille "Qualité"
| ID | Label | Formule |
|----|-------|---------|
| `cout_qualite_interne` | Coût qualité interne | sum(coût SAV interne) |
| `cout_sav_refacturable` | Coût SAV refacturable | sum(SAV refacturé) |
| `ca_degrade_sav` | CA dégradé par SAV | CA avant - CA après SAV |
| `impact_apporteur_qualite` | Impact apporteur sur qualité | taux SAV par apporteur |

### 4.3 Famille "Productivité"
| ID | Label | Formule |
|----|-------|---------|
| `ca_par_heure_brut` | CA/h sans prorata | CA / heures totales |
| `ca_par_heure_net` | CA/h net (après SAV) | (CA - coût SAV) / heures |
| `productivite_univers_tech` | Productivité univers×tech | CA/h par couple |
| `productivite_par_apporteur` | Productivité par apporteur | CA/h apporteur |
| `productivite_par_type_rdv` | Productivité par type RDV | CA/h par type |

### 4.4 Famille "Technique"
| ID | Label | Formule |
|----|-------|---------|
| `longueur_chaine_rt_facture` | Durée RT→devis→facture | avg(date_facture - date_rt) |
| `taux_devis_auto_rt` | Taux devis auto depuis RT | count(devis auto) / count(RT) |
| `taux_devis_externes_ignores` | Taux devis externes ignorés | count(devis ignorés) / total |

---

## 5. PLAN DE MIGRATION

### Phase 1: Extension StatIA V2 ✅ TERMINÉE
1. ✅ Audit complet
2. ✅ Nouvelles familles de métriques (dossiers, qualite, productivite, complexite, reseau)
3. ✅ Classe B corrigée (avoirs franchiseur → montants négatifs)
4. ✅ StatIA Builder UI créé
5. ✅ Rules.ts enrichi avec règles métier complètes

### Phase 2: Migration Agence ✅ TERMINÉE
1. ✅ Adaptateur DataService → ApogeeDataServices créé
2. ✅ Hooks useStatiaAgency* créés (contexte agence intégré)
3. ✅ **Dashboard.tsx migré vers StatIA** (5 KPIs: CA, Taux SAV, Taux Transfo, Panier Moyen, Montant Restant)
4. ✅ **IndicateursUnivers.tsx migré vers StatIA** (CA par univers, Dossiers, Panier moyen)
5. ✅ **MesIndicateursCard.tsx migré vers StatIA** (CA, Taux SAV, Délai facturation, Nb dossiers)
6. ✅ **DiffusionKpiTiles.tsx migré vers StatIA** (CA, Taux SAV, Taux Transfo, CA par univers)

### Phase 3: Migration Franchiseur ✅ TERMINÉE
1. ✅ **FranchiseurStats.tsx (Tableaux)** → `useFranchiseurStatsStatia.ts` (matrices Univers×Apporteurs, Tech×Univers)
2. ✅ **FranchiseurComparison.tsx (Périodes)** → `usePeriodComparisonStatia.ts` (comparaison CA, dossiers, SAV)
3. ✅ **ReseauGraphiquesPage.tsx** déjà StatIA (`useStatiaReseauDashboard`, `useStatiaComparatifAgences`)
4. ⏳ Suppression progressive de `networkCalculations.ts` (après validation production)

---

## 6. ARCHITECTURE CIBLE

```
src/statia/
├── domain/
│   └── rules.ts              # STATIA_RULES (existant)
├── definitions/
│   ├── types.ts              # Types de base
│   ├── index.ts              # Registre central
│   ├── ca.ts                 # CA (existant)
│   ├── univers.ts            # Univers (existant)
│   ├── apporteurs.ts         # Apporteurs (existant)
│   ├── techniciens.ts        # Techniciens (existant)
│   ├── sav.ts                # SAV (existant)
│   ├── devis.ts              # Devis (existant)
│   ├── recouvrement.ts       # Recouvrement (existant)
│   ├── dossiers.ts           # NOUVEAU: Famille Dossier
│   ├── qualite.ts            # NOUVEAU: Famille Qualité
│   └── productivite.ts       # NOUVEAU: Famille Productivité
├── engine/
│   ├── computeStat.ts        # Moteur (existant)
│   ├── loaders.ts            # Chargement (existant)
│   └── normalizers.ts        # Normalisation (existant)
├── api/
│   ├── getMetric.ts          # API principale (existant)
│   ├── getMetricForAgency.ts # Wrapper agence (existant)
│   └── getMetricForNetwork.ts# Wrapper réseau (existant)
├── components/
│   └── StatiaBuilder/        # NOUVEAU: UI Builder
│       ├── StatiaBuilder.tsx
│       ├── DimensionCapsule.tsx
│       ├── MeasureCapsule.tsx
│       ├── FilterCapsule.tsx
│       ├── DropZone.tsx
│       └── ResultPreview.tsx
└── hooks/
    └── useStatia.ts          # Hooks React (existant)
```
