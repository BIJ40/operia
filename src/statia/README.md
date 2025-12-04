# StatIA - Moteur de Statistiques Centralisé

## Vue d'ensemble

StatIA est le moteur central de métriques de l'application HelpConfort. Il fournit :
- Des métriques "core" prédéfinies (CA, SAV, productivité, etc.)
- Un Builder pour créer des métriques personnalisées
- Une API unifiée pour consommer les métriques

## Architecture

```
src/statia/
├── api/                    # API publique
│   ├── getMetric.ts        # Point d'entrée principal
│   ├── getMetricForAgency.ts
│   └── getMetricForNetwork.ts
├── components/
│   └── StatiaBuilder/      # Interface de construction de métriques
├── definitions/            # Définitions des métriques core
│   ├── index.ts            # Registre central
│   ├── ca.ts               # Métriques CA
│   ├── sav.ts              # Métriques SAV
│   └── ...
├── domain/
│   └── rules.ts            # STATIA_RULES - règles métier
├── engine/
│   ├── computeStat.ts      # Moteur de calcul
│   ├── loaders.ts          # Chargement des données
│   └── normalizers.ts      # Normalisation
├── hooks/
│   ├── useStatia.ts        # Hooks React Query
│   └── useCustomMetrics.ts # Hooks métriques custom
├── services/
│   └── customMetricsService.ts  # CRUD métriques custom
└── pages/
    ├── StatiaBuilderAdminPage.tsx   # Route /admin/statia-builder
    └── StatiaBuilderAgencyPage.tsx  # Route /pilotage/statia-builder
```

## Métriques Core

Les métriques core sont définies dans `definitions/` et automatiquement disponibles :

| Catégorie | Métriques |
|-----------|-----------|
| CA | `ca_global_ht`, `ca_mensuel`, `ca_par_univers`, `ca_par_apporteur` |
| Techniciens | `ca_par_technicien`, `ca_technicien_univers` |
| SAV | `taux_sav_global`, `sav_par_univers`, `sav_par_technicien` |
| Devis | `taux_transformation_devis`, `devis_en_cours` |
| Recouvrement | `taux_recouvrement`, `encours_client` |

## Métriques Custom (Builder)

### Schema `statia_custom_metrics`

```sql
CREATE TABLE statia_custom_metrics (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  scope TEXT NOT NULL CHECK (scope IN ('global', 'agency')),
  agency_slug TEXT,
  definition_json JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

### Structure `definition_json`

```json
{
  "measure": "ca_global_ht",
  "aggregation": "sum",
  "sources": ["factures", "projects"],
  "dimensions": ["technicien", "univers"],
  "filters": {
    "exclude_sav": true,
    "exclude_rt": true
  },
  "time": {
    "field": "date_facture",
    "mode": "periode",
    "granularity": "mois"
  }
}
```

## Règles de Scope et Sécurité

### Portée des métriques

| Scope | Visibilité | Création |
|-------|------------|----------|
| `global` | Tout le réseau | N5/N6 uniquement |
| `agency` | Agence spécifique | N2+ de l'agence |

### Droits d'accès

| Rôle | Accès Builder | Créer Global | Créer Agence | Voir Autres Agences |
|------|---------------|--------------|--------------|---------------------|
| N6 (Superadmin) | ✅ Admin | ✅ | ✅ | ✅ |
| N5 (Platform Admin) | ✅ Admin | ✅ | ✅ | ✅ |
| N3 (Franchiseur) | ✅ Agence | ❌ | ✅ | ❌ |
| N2 (Dirigeant) | ✅ Agence | ❌ | ✅ | ❌ |
| N1 et moins | ❌ | ❌ | ❌ | ❌ |

### Routes

- `/admin/statia-builder` : Mode admin (N5+) avec sélecteur d'agence
- `/pilotage/statia-builder` : Mode agence (N2+) contexte fixe

## Utilisation API

### Frontend (React)

```tsx
import { useStatiaMetric, useStatiaMetrics } from '@/statia';

// Une métrique
const { data, isLoading } = useStatiaMetric('ca_global_ht', {
  dateRange: { start, end },
  agencySlug: 'dax'
});

// Plusieurs métriques
const { data } = useStatiaMetrics(
  ['ca_global_ht', 'taux_sav_global'],
  params
);
```

### Services

```ts
import { getMetric, getMetricForAgency } from '@/statia';

// Appel direct
const result = await getMetric('ca_global_ht', params, services);

// Contexte agence
const result = await getMetricForAgency('ca_mensuel', 'dax', params, services);
```

## Règles Métier (STATIA_RULES)

Les règles métier sont centralisées dans `domain/rules.ts` :

- **CA** : source `apiGetFactures.data.totalHT`, avoirs en négatif
- **Techniciens** : types productifs = dépannage, travaux
- **SAV** : rattaché au technicien d'origine
- **Devis** : états validés = validated, signed, order, accepted

## Migration des pages existantes

Toutes les pages de statistiques doivent utiliser StatIA :

```tsx
// ❌ Ancien code
const ca = calculateCA(factures);

// ✅ Nouveau code
const { data: ca } = useStatiaMetric('ca_global_ht', params);
```

## Développement

### Ajouter une métrique core

1. Créer la définition dans `definitions/[category].ts`
2. L'exporter dans `definitions/index.ts`
3. Documenter dans ce README

### Tester

```ts
import { compareWithLegacy } from '@/statia/dev/compareWithLegacy';

// Compare StatIA avec les anciens calculs
await compareWithLegacy('ca_global_ht', params);
```
