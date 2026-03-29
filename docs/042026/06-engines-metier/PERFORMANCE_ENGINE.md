# Moteur Performance Terrain

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

Le moteur Performance analyse l'efficacité des techniciens terrain : durées d'intervention, matching visites/créneaux, taux de charge, productivité.

## 2. Architecture

```
src/modules/performance/engine/
├── rules.ts               # Règles métier et seuils
├── computePerformance.ts  # Calcul principal
├── matchVisits.ts         # Matching visites ↔ créneaux
├── durationHierarchy.ts   # Hiérarchie durées
├── confidenceScore.ts     # Score de confiance
└── __tests__/             # 51 tests unitaires
```

## 3. Métriques

| Métrique | Description | Seuils |
|----------|-------------|--------|
| **Taux de charge** | Heures planifiées / heures disponibles | min/max configurables par agence |
| **Productivité** | Heures facturées / heures payées | optimal/warning par agence |
| **Taux SAV** | Interventions SAV / total interventions | optimal/warning |
| **Durée moyenne** | Temps moyen par intervention | Par type d'univers |

## 4. Configuration par agence

Table `agency_performance_config` :
- `load_min`, `load_max` — bornes taux de charge
- `productivity_optimal`, `productivity_warning`
- `sav_optimal`, `sav_warning`
- `default_weekly_hours` — base horaire hebdo
- `holidays` — jours fériés (JSONB)

## 5. Tests

51 tests unitaires couvrant :
- Calculs de durée (hiérarchie de sources)
- Matching visites/créneaux (tolérance temporelle)
- Score de confiance (données manquantes)
- Seuils et alertes
- Cas limites (zéro heures, données nulles)
