# AUDIT MODULE PILOTAGE AGENCE
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Dashboard de pilotage pour les dirigeants d'agence (N2+). Centralise KPIs, statistiques et accès aux outils de gestion quotidienne.

### Routes
- `/hc-agency` - Dashboard principal
- `/hc-agency/stats` - Statistiques détaillées
- `/hc-agency/diffusion` - Écran diffusion TV
- `/hc-agency/rapport-mensuel` - Rapport direction

### Tables Supabase
```
diffusion_settings        - Configuration écran diffusion
monthly_report_settings   - Configuration rapport mensuel
monthly_reports           - Rapports générés
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/agency/
├── AgencyDashboard.tsx        # Dashboard principal
├── AgencyStats.tsx            # Statistiques
├── DiffusionScreen.tsx        # Écran TV
└── MonthlyReportPage.tsx      # Rapport mensuel

src/hooks/
├── use-agency-kpis.ts         # KPIs temps réel
└── use-monthly-report.ts      # Génération rapport
```

### Intégration StatIA
```typescript
// KPIs affichés depuis StatIA
- CA mois / année
- Interventions
- Taux transformation devis
- Délai moyen intervention
- Recouvrement
```

## 3. OPTIONS MODULE

### pilotage_agence.options
```typescript
{
  vue_ensemble: boolean    // Dashboard de base (STARTER)
  stats_avancees: boolean  // Stats détaillées (PRO)
  rapport_mensuel: boolean // Rapport PDF (PRO)
  diffusion: boolean       // Écran TV (PRO)
}
```

## 4. ÉCRAN DIFFUSION

### Fonctionnalités
- Carousel automatique
- KPIs temps réel
- Objectif du mois
- "Le saviez-vous" configurable

### Configuration
```typescript
interface DiffusionSettings {
  enabled_slides: string[]
  rotation_speed_seconds: number
  auto_rotation_enabled: boolean
  objectif_title: string
  objectif_amount: number
  saviez_vous_templates: string[]
}
```

## 5. RAPPORT MENSUEL

### Génération automatique
```sql
-- pg_cron job
-- Le 10 de chaque mois à 08:00 UTC
SELECT cron.schedule(
  'generate-monthly-reports',
  '0 8 10 * *',
  $$SELECT generate_monthly_reports()$$
);
```

### Sections configurables
```typescript
interface ReportSettings {
  enabled_sections: string[]  // synthese, ca, techniciens, etc.
  ca_format: 'euros' | 'kilo_euros'
  custom_note: string
}
```

### Purge automatique
```sql
-- Le 1er de chaque mois à 03:00 UTC
-- Supprime rapports > 12 mois
```

## 6. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Génération rapport peut timeout sur grosses agences

### P2 - Améliorations
- 📝 Export PDF rapport depuis UI
- 📝 Comparaison M-1 plus visuelle
- 📝 Alertes seuils personnalisables

## 7. SÉCURITÉ

### RLS Policies
```sql
-- Rapports: agence uniquement
SELECT: agency_id = get_user_agency_id()
        OR has_min_global_role('franchisor_admin')

-- Settings: N2+ de l'agence
UPDATE: agency_id = get_user_agency_id()
        AND has_min_global_role('franchisee_admin')
```

### Stockage rapports
```
Bucket: monthly-reports
Path: {agency_id}/{year}/{month}/report.pdf
```

## 8. TESTS RECOMMANDÉS

```typescript
// Dashboard
1. Vérifier KPIs cohérents avec StatIA
2. Vérifier données agence uniquement

// Diffusion
1. Configurer slides
2. Vérifier rotation automatique
3. Vérifier mise à jour temps réel

// Rapport
1. Générer rapport preview
2. Vérifier toutes sections
3. Vérifier PDF téléchargeable
```

## 9. ÉVOLUTIONS PRÉVUES

1. Export PDF depuis UI (pas seulement génération auto)
2. Comparaison M-1 avec graphiques tendance
3. Alertes seuils configurables par agence
4. Intégration objectifs équipe
5. Widget mobile résumé quotidien
