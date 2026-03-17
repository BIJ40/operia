

# Plan — Module Rentabilité Dossier (Phase 1 : Fondations)

## Contexte

Le projet dispose déjà de :
- Données API Apogée riches (factures avec `calc.paidTTC`, interventions avec heures extractibles, projets, clients)
- Module financier agence (`agency_financial_charges`, `agency_financial_months`, `agency_financial_summary`)
- Table `collaborators` avec `apogee_user_id` pour le lien technicien
- `extractHoursFromIntervention` existant dans `chargeTravauxEngine.ts`
- Repository pattern + `BaseQueryService`

Ce module est distinct du pilotage avancé (prévisionnel). Il analyse la **rentabilité réelle** dossier par dossier, sans aucune dépendance aux devis.

## Tables SQL à créer (6 tables)

### 1. `employee_cost_profiles`
Coût horaire chargé par collaborateur. Lié à `collaborators.id`.
- `id`, `agency_id`, `collaborator_id` (FK collaborators), `salary_gross_monthly`, `employer_charges_rate`, `employer_monthly_cost`, `monthly_paid_hours`, `monthly_productive_hours`, `vehicle_monthly_cost`, `fuel_monthly_cost`, `equipment_monthly_cost`, `other_monthly_costs`, `loaded_hourly_cost`, `cost_source` (enum: manual/bulletin/computed), `effective_from`, `effective_to`, `created_by`, `created_at`, `updated_at`

### 2. `employee_salary_documents`
Upload bulletins de salaire avec extraction.
- `id`, `agency_id`, `collaborator_id` (FK), `file_path`, `period_month`, `extracted_gross_salary`, `extracted_net_salary`, `extracted_employer_cost`, `extracted_hours`, `extracted_data_json` (jsonb), `extraction_status` (enum: pending/parsed/error), `validation_status` (enum: pending/validated/rejected), `validated_by`, `validated_at`, `created_by`, `created_at`

### 3. `project_costs`
Table unique pour achats + frais par dossier.
- `id`, `agency_id`, `project_id` (text, ref Apogée), `cost_type` (enum: purchase/subcontract/travel/rental/misc), `description`, `cost_date`, `amount_ht`, `vat_rate`, `amount_ttc`, `source` (enum: manual/invoice_upload), `document_path`, `extracted_data_json` (jsonb), `validation_status` (enum: draft/validated), `created_by`, `created_at`, `updated_at`

### 4. `project_cost_documents`
Factures fournisseur uploadées avec extraction OCR.
- `id`, `agency_id`, `project_id`, `file_path`, `extracted_ht`, `extracted_vat`, `extracted_ttc`, `extracted_date`, `extracted_supplier`, `extracted_data_json` (jsonb), `extraction_status` (enum), `validation_status` (enum), `linked_cost_id` (FK project_costs nullable), `created_by`, `created_at`

### 5. `agency_overhead_rules`
Règles d'imputation charges agence sur dossiers.
- `id`, `agency_id`, `cost_type` (enum: rent/vehicle/fuel/admin/software/insurance/other), `period_month`, `amount_ht`, `allocation_mode` (enum: per_project/percentage_ca/per_hour/fixed), `allocation_value`, `validation_status` (enum: draft/validated), `created_by`, `created_at`, `updated_at`

### 6. `project_profitability_snapshots`
Cache consolidé par dossier.
- `id`, `agency_id`, `project_id` (text), `computed_at`, `ca_invoiced_ht`, `ca_collected_ttc`, `cost_labor`, `cost_purchases`, `cost_subcontracting`, `cost_other`, `cost_overhead`, `cost_total`, `gross_margin`, `net_margin`, `margin_pct`, `hours_total`, `completeness_score` (0-100), `reliability_level` (enum: insufficient/low/medium/good/excellent), `flags_json` (jsonb), `validation_status` (enum: draft/validated), `created_by`, `created_at`

### RLS
Toutes les tables : `agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())`, pattern identique à `agency_financial_charges`.

### Storage bucket
`project-documents` — pour bulletins et factures fournisseur.

## Moteur de calcul

Fichier : `src/statia/shared/projectProfitabilityEngine.ts`

### Inputs
```ts
interface ProfitabilityInputs {
  // API Apogée
  project: Project;
  factures: Facture[];
  interventions: Intervention[];
  // Supabase
  laborEntries: { collaborator_id: string; hours: number; loaded_hourly_cost: number }[];
  costProfiles: EmployeeCostProfile[];
  projectCosts: ProjectCost[];
  overheadRules: AgencyOverheadRule[];
}
```

### Calculs (uniquement réel, zéro devis)

```text
CA facturé HT = Σ factures HT − Σ avoirs HT
CA encaissé  = Σ factures.calc.paidTTC

Coût MO = Σ (heures intervention × loaded_hourly_cost du technicien)
  fallback si pas de profil coût : heures × coût moyen agence
  flag 'labor_cost_estimated' si fallback

Coût achats     = Σ project_costs type=purchase validated
Coût sous-trait = Σ project_costs type=subcontract validated
Coût autres     = Σ project_costs type=travel|rental|misc validated

Charges agence imputées = selon allocation_mode :
  per_project → allocation_value (forfait)
  percentage_ca → CA facturé × allocation_value / 100
  per_hour → heures × allocation_value
  fixed → allocation_value

Coût total = MO + achats + sous-trait + autres + charges

Marge brute = CA facturé − (MO + achats + sous-trait + autres)
Marge nette = Marge brute − charges agence
Marge % = Marge nette / CA facturé × 100
```

### Score de fiabilité (0-100, 9 contrôles)

| Contrôle | Poids |
|----------|-------|
| Factures présentes | 20 |
| Heures présentes | 15 |
| Coût MO calculable (profil coût existe) | 15 |
| Coûts dossier renseignés | 10 |
| Charges agence configurées | 10 |
| Données MO validées (pas estimated) | 10 |
| Factures cohérentes (pas de montant 0) | 5 |
| Heures > 0 | 10 |
| Dossier clos ou facturé | 5 |

Niveaux : <20 insufficient, <40 low, <60 medium, <80 good, ≥80 excellent

### Alertes automatiques
Générées dans le moteur comme flags :
- `negative_margin`, `no_invoices`, `no_hours`, `labor_cost_estimated`, `missing_cost_profile`, `overhead_not_configured`, `high_overhead_ratio`

## Types TypeScript

Fichier : `src/types/projectProfitability.ts`

Interfaces pour : `EmployeeCostProfile`, `SalaryDocument`, `ProjectCost`, `ProjectCostDocument`, `AgencyOverheadRule`, `ProfitabilitySnapshot`, `ProfitabilityResult` (output moteur).

## Hook

`src/hooks/useProjectProfitability.ts`

- Charge données Supabase (costs, profiles, overheads, snapshot)
- Reçoit données API Apogée en props (factures, interventions du projet)
- Appelle le moteur
- Retourne `ProfitabilityResult`

## Repository

`src/repositories/profitabilityRepository.ts` — CRUD pour les 6 tables via `BaseQueryService` pattern.

## Ordre d'implémentation

1. **Migration SQL** : 6 tables + enums + RLS + storage bucket
2. **Types** : `src/types/projectProfitability.ts`
3. **Moteur** : `src/statia/shared/projectProfitabilityEngine.ts`
4. **Repository** : `src/repositories/profitabilityRepository.ts`
5. **Hook** : `src/hooks/useProjectProfitability.ts`

## Ce plan ne fait PAS
- Pas d'UI (Phase 2)
- Pas d'import CSV (Phase 2)
- Pas d'edge function OCR (Phase 2 — nécessitera un service externe)
- Pas de formulaires de saisie (Phase 2)
- Pas de fiche dossier (Phase 3)
- Pas de vue portefeuille (Phase 4)

## Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | 6 tables + RLS + bucket |
| `src/types/projectProfitability.ts` | Créé |
| `src/statia/shared/projectProfitabilityEngine.ts` | Créé |
| `src/repositories/profitabilityRepository.ts` | Créé |
| `src/hooks/useProjectProfitability.ts` | Créé |

Aucun fichier existant n'est modifié ni supprimé.

