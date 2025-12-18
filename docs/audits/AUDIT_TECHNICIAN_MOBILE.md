# AUDIT MODULE TECHNICIEN MOBILE
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Plateforme mobile dédiée aux techniciens (N1) pour la gestion quotidienne: planning, pointage, timesheets, et accès documents RH/parc.

### Routes
- `/t` - Dashboard technicien
- `/t/planning` - Planning Apogée
- `/t/pointage` - Pointage & timesheets
- `/t/rh-parc` - Documents RH, véhicule, matériel

### Tables Supabase
```
planning_packages           - Packages planning semaine
planning_package_recipients - Signatures planning
timesheets                 - Feuilles de temps
timesheet_entries          - Entrées journalières
collaborator_documents     - Documents RH (employee_visible)
fleet_vehicles             - Véhicules assignés
fleet_equipment            - Équipements assignés
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/technician/
├── TechnicianLayout.tsx       # Layout mobile
├── TechnicianDashboard.tsx    # Dashboard
├── TechnicianPlanning.tsx     # Planning Apogée
├── TechnicianPointage.tsx     # Pointage unifié
├── TechnicianRHParc.tsx       # Docs & matériel
└── components/
    ├── BottomNav.tsx          # Navigation basse
    ├── DailyClocking.tsx      # Pointage jour
    ├── WeeklyTimesheet.tsx    # Timesheet semaine
    └── PlanningSignature.tsx  # Signature planning
```

### Liaison Apogée
```typescript
// Récupération planning via apogee_user_id
const apogeeUserId = profile.apogee_user_id || collaborator.apogee_user_id

// API Apogée
GET /api/apiGetInterventionsCreneaux?userId={apogeeUserId}&from=...&to=...
```

## 3. WORKFLOW POINTAGE

### Pointage journalier
```typescript
interface DailyClocking {
  date: string
  clock_in: string    // HH:mm
  clock_out: string   // HH:mm
  break_minutes: number
  notes: string
}
```

### Timesheet semaine
```typescript
interface TimesheetEntry {
  date: string
  hours_worked: number
  break_minutes: number
  project_id: string | null
  notes: string
}
```

### États timesheet
```
DRAFT → SUBMITTED → N2_MODIFIED → COUNTERSIGNED → VALIDATED
```

### Règles workflow
- N1 édite uniquement en DRAFT
- N2 peut modifier → passe en N2_MODIFIED
- N1 doit contre-signer modifications
- N1 ne peut PAS refuser modifications
- Modifications affichées en rouge

## 4. SIGNATURE PLANNING

### Workflow
```
1. N2 génère package planning semaine
2. Package envoyé aux techniciens concernés
3. Technicien consulte planning
4. Technicien signe (signature + commentaire)
5. Signature stockée avec timestamp
```

### Structure
```typescript
interface PlanningPackage {
  week_start: string
  agency_id: string
  content: Json  // Planning Apogée
  created_by: string
}

interface PackageRecipient {
  package_id: string
  user_id: string
  signed_at: string | null
  signature_data: string | null
  comment: string | null
}
```

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Planning Apogée peut être lent à charger
- ⚠️ Offline non supporté

### P2 - Améliorations
- 📝 Mode offline avec sync
- 📝 Push notifications
- 📝 Géolocalisation pointage

## 6. SÉCURITÉ

### Isolation données
```sql
-- Technicien voit uniquement ses données
SELECT: user_id = auth.uid()

-- Documents: employee_visible = true
SELECT: 
  collaborator_id IN (
    SELECT id FROM collaborators WHERE user_id = auth.uid()
  )
  AND employee_visible = true
```

### Points d'attention
- ✅ Pas d'accès aux données autres techniciens
- ✅ Pas d'accès back-office
- ✅ Documents filtrés par visibilité

## 7. RESPONSIVE DESIGN

### Breakpoints
```css
/* Mobile first */
.technician-layout {
  /* Base: mobile */
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablette: ajustements */
}

@media (min-width: 1024px) {
  /* Desktop: redirection vers /hc-agency */
}
```

### Navigation
- Bottom nav fixe sur mobile
- 4 items: Dashboard, Planning, Pointage, RH/Parc

## 8. TESTS RECOMMANDÉS

```typescript
// Planning
1. Vérifier chargement planning Apogée
2. Vérifier filtrage par apogee_user_id
3. Signer planning → vérifier enregistrement

// Pointage
1. Créer entrée pointage jour
2. Soumettre timesheet semaine
3. N2 modifie → vérifier notification N1
4. N1 contre-signe → vérifier état final

// Isolation
1. Technicien A ne voit pas données B
2. Documents non employee_visible invisibles
```

## 9. ÉVOLUTIONS PRÉVUES

1. Mode offline avec synchronisation
2. Push notifications (rappel pointage)
3. Géolocalisation pointage (optionnel)
4. Scan QR équipements
5. Déclaration anomalies véhicule
