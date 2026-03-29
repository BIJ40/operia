# Moteur Prospection / CRM

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

Le module Prospection est un CRM léger intégré permettant le suivi de prospects, le scoring d'apporteurs et la gestion du pipeline commercial.

## 2. Architecture

```
src/prospection/
├── components/           # UI prospection
├── hooks/                # Hooks React Query
├── services/             # CRUD prospects
└── types/                # Types TypeScript
```

## 3. Pipeline (6 états)

| État | Description |
|------|------------|
| `nouveau` | Prospect identifié |
| `contacte` | Premier contact effectué |
| `qualifie` | Besoin confirmé |
| `proposition` | Devis envoyé |
| `gagne` | Conversion client |
| `perdu` | Prospect perdu |

## 4. Scoring apporteurs

Scoring adaptatif basé sur :
- Volume de prescriptions
- Taux de conversion
- Délai moyen
- Qualité des dossiers

## 5. Import Excel

Import de fichiers prospects via `xlsx` (SheetJS) :
- Mapping colonnes automatique
- Détection doublons
- Validation données

## 6. Accès

- **Module** : `prospection` ou `commercial.prospects`
- **Rôle minimum** : `franchisee_user` (N1)
- **Plan** : STARTER+
