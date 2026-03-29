# Moteur StatIA — Statistiques Centralisées

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

StatIA est le moteur central de métriques d'OPERIA. Il fournit des métriques prédéfinies (CA, SAV, productivité) et un Builder pour créer des métriques personnalisées.

## 2. Architecture

```
src/statia/
├── api/                    # API publique
│   ├── getMetric.ts        # Point d'entrée principal
│   ├── getMetricForAgency.ts
│   └── getMetricForNetwork.ts
├── components/StatiaBuilder/  # Interface construction métriques
├── definitions/            # Définitions métriques core
│   ├── index.ts            # Registre central
│   ├── ca.ts, sav.ts, ...  # Par catégorie
├── domain/rules.ts         # STATIA_RULES (règles métier)
├── engine/
│   ├── computeStat.ts      # Moteur de calcul
│   ├── loaders.ts          # Chargement données
│   └── normalizers.ts      # Normalisation
├── hooks/
│   ├── useStatia.ts        # Hook React Query
│   └── useCustomMetrics.ts
├── rules/                  # Règles métier (JSON + TS)
├── services/customMetricsService.ts
└── pages/                  # StatiaBuilder admin/agence
```

## 3. Métriques Core

| Catégorie | Métriques |
|-----------|-----------|
| **CA** | `ca_global_ht`, `ca_mensuel`, `ca_par_univers`, `ca_par_apporteur` |
| **Techniciens** | `ca_par_technicien`, `ca_technicien_univers` |
| **SAV** | `taux_sav_global`, `sav_par_univers`, `sav_par_technicien` |
| **Devis** | `taux_transformation_devis`, `devis_en_cours` |
| **Recouvrement** | `taux_recouvrement`, `encours_client` |

## 4. Règles métier (STATIA_RULES)

- **CA** : source `apiGetFactures.data.totalHT`, avoirs en négatif
- **Techniciens** : types productifs = dépannage, travaux
- **SAV** : rattaché au technicien d'origine
- **Devis** : états validés = validated, signed, order, accepted

## 5. Builder (métriques custom)

Table `statia_custom_metrics` — métriques personnalisées par agence ou globales.

| Scope | Visibilité | Création |
|-------|------------|----------|
| `global` | Tout le réseau | N5/N6 |
| `agency` | Agence spécifique | N2+ |

## 6. API

```tsx
// Hook React
const { data } = useStatiaMetric('ca_global_ht', { dateRange, agencySlug });

// Service direct
const result = await getMetric('ca_global_ht', params, services);
```

## 7. Routes

- `/admin/statia-builder` : Mode admin (N5+)
- `/pilotage/statia-builder` : Mode agence (N2+)
