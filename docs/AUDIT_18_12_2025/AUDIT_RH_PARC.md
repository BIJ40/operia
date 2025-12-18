# AUDIT MODULE RH & PARC
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Module de gestion RH et parc matériel avec séparation stricte N1 (employé) / N2 (manager). Inclut gestion collaborateurs, documents, demandes, véhicules, EPI.

### Routes N2 (Back-office)
- `/rh` - Index RH
- `/rh/equipe` - Liste collaborateurs
- `/rh/equipe/:id` - Fiche collaborateur
- `/rh/demandes` - Demandes à traiter
- `/rh/plannings` - Gestion plannings
- `/rh/documents` - Documents RH

### Routes N1 (Portail employé)
- `/rh/coffre` - Mon coffre RH
- `/rh/demande` - Mes demandes
- `/rh/mon-planning` - Mon planning
- `/rh/signature` - Ma signature

### Tables Supabase
```
collaborators                    - Collaborateurs
collaborator_documents           - Documents RH
collaborator_sensitive_data      - Données chiffrées
collaborator_work_profiles       - Profils horaires
rh_requests                      - Demandes unifiées
rh_notifications                 - Notifications N1↔N2
planning_packages               - Packages planning
planning_package_recipients     - Signatures planning
user_signatures                 - Signatures utilisateurs
fleet_vehicles                  - Véhicules
fleet_equipment                 - Équipements/EPI
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/rh/
├── RHIndex.tsx                # Index module
├── CollaborateursPage.tsx     # Liste collaborateurs
├── CollaborateurDetailPage.tsx # Fiche détail
├── DemandesRHUnifiedPage.tsx  # Demandes N2
├── MesCoffreRHPage.tsx        # Coffre N1
├── MesDemandesPage.tsx        # Demandes N1
└── ...

src/hooks/
├── use-collaborators.ts       # CRUD collaborateurs
├── use-rh-requests.ts         # Demandes
├── use-rh-notifications.ts    # Notifications realtime
└── use-sensitive-data.ts      # Données chiffrées
```

### Séparation N1/N2
```
N2 (franchisee_admin):
- Accès back-office complet
- CRUD collaborateurs
- Traitement demandes
- Génération documents

N1 (franchisee_user):
- Portail employé uniquement
- Lecture documents personnels (employee_visible=true)
- Création demandes
- Signature planning
```

## 3. WORKFLOW DEMANDES

### Types de demandes
```typescript
type RequestType = 'LEAVE' | 'EPI' | 'DOCUMENT_REQUEST'
```

### États
```
SUBMITTED → APPROVED | REJECTED | CANCELLED
```

### Notifications bidirectionnelles
```
N1 crée demande → REQUEST_CREATED → N2
N2 traite       → REQUEST_COMPLETED/REJECTED → N1
```

## 4. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Synchronisation profiles ↔ collaborators parfois décalée
- ⚠️ Notifications realtime peuvent être lentes

### P2 - Améliorations
- 📝 Export masse documents
- 📝 Alertes expiration documents
- 📝 Dashboard RH avec KPIs

## 5. SÉCURITÉ

### Données sensibles
```typescript
// Champs chiffrés dans collaborator_sensitive_data
- birth_date_encrypted
- social_security_number_encrypted
- emergency_contact_encrypted
- emergency_phone_encrypted
```

### RLS Policies
```sql
-- N1 voit uniquement ses documents
SELECT: employee_visible = true 
        AND collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())

-- N2 voit tous les collaborateurs de son agence
SELECT: agency_id = get_user_agency_id()
        AND has_min_global_role('franchisee_admin')
```

### Points d'attention
- ✅ Données sensibles chiffrées
- ✅ Logs d'accès documents
- ✅ Séparation stricte N1/N2

## 6. SYNCHRONISATION

### Profiles ↔ Collaborators
```sql
-- Trigger automatique
profiles.apogee_user_id ↔ collaborators.apogee_user_id
profiles.user_id ↔ collaborators.user_id
```

### Points d'attention
- Mise à jour dans un sens propage à l'autre
- `apogee_user_id` critique pour planning technicien

## 7. TESTS RECOMMANDÉS

```typescript
// Workflow demande
1. N1 crée demande LEAVE
2. Vérifier notification N2
3. N2 approuve
4. Vérifier notification N1
5. Vérifier statut APPROVED

// Isolation données
- N1 ne voit pas documents d'autres collaborateurs
- N1 ne peut pas accéder back-office
- N2 ne voit que son agence
```

## 8. ÉVOLUTIONS PRÉVUES

1. P2 - Génération lettres PDF avec signature
2. Dashboard RH avec KPIs
3. Alertes documents expirants
4. Import/export masse
