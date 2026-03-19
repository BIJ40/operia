

## Plan: Corrections Pilotage avancé (4 points)

### 1. Maturité Pipeline — Ajouter tooltips explicatifs au survol

**Fichier**: `PipelineMaturityCard.tsx`

Ajouter un tooltip (via `HoverCard` ou `title`) sur chaque étape du funnel expliquant les critères de classification :
- **Commercial** : dossier sans devis validé ni date planifiée
- **À commander** : devis en attente de commande (`devis_to_order`)
- **Prêt planif.** : état `to_planify_tvx` avec devis validé
- **Planifié** : date d'intervention future trouvée
- **Bloqué** : en attente fournisseur (`wait_fourn`)

Base de dossiers : uniquement les projets dans les 3 états éligibles (`to_planify_tvx`, `devis_to_order`, `wait_fourn`).

---

### 2. Ancienneté des dossiers — Corriger la récupération de la date de création

**Fichier**: `chargeTravauxEngine.ts`, ligne 463

Le bug : le code cherche `project?.createdAt` (camelCase) alors que l'API Apogée retourne `project.created_at` (snake_case). Tout le reste du codebase utilise `project.created_at || project.date`.

**Correction** :
```
project.created_at || project.date || project?.createdAt || project?.data?.createdAt
```

Cela éliminera la catégorie "Inconnu" pour les dossiers qui ont bien une date.

---

### 3. Dossiers à risque — Ajouter tooltip explicatif au survol

**Fichier**: `RiskDossiersCard.tsx`

Au survol de chaque dossier, afficher le détail du score via un `HoverCard` :
- **Flux** (25%) : score X% — stagnation temporelle
- **Données** (40%) : score X% — complétude des informations
- **Valeur** (35%) : score X% — enjeu financier
- **Score global** : X%

---

### 4. Charge hebdomadaire — Corriger le calcul

**Fichier**: `chargeTravauxEngine.ts`, lignes 733-752

Le calcul actuel ne fonctionne que pour les interventions ayant une date dans les 4 prochaines semaines (`dateReelle` ou `date`). Or la plupart des dossiers éligibles (`to_planify_tvx`, `devis_to_order`) n'ont PAS encore de date d'intervention planifiée.

**Correction** : pour les dossiers sans date d'intervention, répartir les heures estimées sur les semaines à venir selon l'état du workflow :
- `to_planify_tvx` → S+1 (prêts à planifier)
- `devis_to_order` → S+2 (en attente commande)
- `wait_fourn` → S+3 (en attente fournitures)

Les dossiers avec une date d'intervention planifiée restent dans leur semaine réelle.

---

### Fichiers impactés
| Fichier | Modification |
|---------|-------------|
| `src/statia/shared/chargeTravauxEngine.ts` | Fix date field (L463), fix weekly load logic (L733+) |
| `src/apogee-connect/components/stats-hub/previsionnel/PipelineMaturityCard.tsx` | Tooltips explicatifs par étape |
| `src/apogee-connect/components/stats-hub/previsionnel/RiskDossiersCard.tsx` | HoverCard détail score risque |

