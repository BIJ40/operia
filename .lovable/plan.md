

# Corrections finales avant implémentation

## 1. Liste explicite des 6 indexes

```text
1. idx_afm_agency_year
   → agency_financial_months (agency_id, year)

2. idx_afm_agency_monthdate
   → agency_financial_months (agency_id, make_date(year, month, 1))

3. idx_afu_month
   → agency_financial_univers (financial_month_id)

4. idx_afc_agency_period
   → agency_financial_charges (agency_id, start_month, end_month)

5. idx_unique_charge_period
   → UNIQUE agency_financial_charges (agency_id, charge_type, start_month) WHERE end_month IS NULL

6. idx_afo_month
   → agency_financial_overrides (financial_month_id)
```

## 2. CABlock sans badges source

CABlock affichera `ca_total`, `achats`, `sous_traitance` en lecture seule, sans badge de provenance. Les badges seront limités à :
- **Univers** : badge par ligne univers (source APOGEE/MANUAL)
- **Overrides** : badge "Override" sur les champs corrigés manuellement
- **Verrouillage** : badge "Mois verrouillé" global quand `locked_at` est défini

## 3. CHECK vs Triggers — répartition corrigée

**CHECK constraints** (validation structurelle simple) :
- `start_month = date_trunc('month', start_month)::date`
- `end_month IS NULL OR end_month = date_trunc('month', end_month)::date`
- `end_month IS NULL OR end_month >= start_month`
- `month BETWEEN 1 AND 12`
- `year BETWEEN 2020 AND 2099`
- Override non-négatif : `field_name NOT IN ('nb_interventions','nb_factures') OR override_value >= 0`

**Triggers** (logique métier) :
- `prevent_locked_month_update` — bloque UPDATE sur mois verrouillé
- `prevent_locked_month_child_write` — bloque INSERT/UPDATE/DELETE sur univers/overrides si mois parent verrouillé
- `update_financial_updated_at` — auto-refresh `updated_at`

---

Aucun autre changement au plan validé. Prêt pour implémentation.

