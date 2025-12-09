# Architecture Profiles / Collaborators

## État des lieux (AS-IS) - Audit décembre 2024

### 1. Schéma actuel

```
┌─────────────────┐     ┌───────────────────────────────────────────────────────┐
│   auth.users    │────▶│                    profiles                           │
│  (Supabase)     │     │  - id (PK, FK → auth.users)                          │
│                 │     │  - first_name, last_name, email, phone ◀── MASTER    │
│                 │     │  - agency_id (FK → apogee_agencies)                   │
│                 │     │  - apogee_user_id                                     │
│                 │     │  - global_role, enabled_modules                       │
└─────────────────┘     └───────────────────────────────────────────────────────┘
                                            │
                                            │ user_id (optionnel)
                                            ▼
                        ┌───────────────────────────────────────────────────────┐
                        │                 collaborators                         │
                        │  - id (PK)                                            │
                        │  - user_id (FK → profiles, UNIQUE nullable)           │
                        │  - first_name, last_name, email, phone ◀── DUPLIQUÉS │
                        │  - agency_id ◀── DUPLIQUÉ                             │
                        │  - apogee_user_id ◀── DUPLIQUÉ                        │
                        │  - type, role, hiring_date, leaving_date              │
                        │  - address, postal_code, city, notes                  │
                        └───────────────────────────────────────────────────────┘
                                            │
                                            │ collaborator_id
                                            ▼
                        ┌───────────────────────────────────────────────────────┐
                        │          collaborator_sensitive_data                  │
                        │  - social_security_number_encrypted                   │
                        │  - birth_date_encrypted                               │
                        │  - emergency_contact_encrypted                        │
                        │  - emergency_phone_encrypted                          │
                        └───────────────────────────────────────────────────────┘
```

### 2. Colonnes dupliquées identifiées

| Colonne | `profiles` | `collaborators` | Règle actuelle |
|---------|------------|-----------------|----------------|
| `first_name` | ✅ MASTER | ⚠️ Copie | Sync via trigger |
| `last_name` | ✅ MASTER | ⚠️ Copie | Sync via trigger |
| `email` | ✅ MASTER | ⚠️ Copie | Sync via trigger |
| `phone` | ✅ MASTER | ⚠️ Copie | Sync via trigger |
| `agency_id` | ✅ MASTER | ⚠️ Copie | Sync via trigger |
| `apogee_user_id` | ✅ MASTER | ⚠️ Copie | Sync via trigger |

### 3. Triggers de synchronisation actuels

```sql
-- profiles → collaborators
sync_collaborator_on_profile_update()
-- Si first_name, last_name, email, phone, apogee_user_id changent sur profiles,
-- réplique vers collaborators WHERE user_id = profiles.id

-- collaborators → profiles
sync_profile_on_collaborator_update()
-- Si first_name, last_name, email, phone changent sur collaborators,
-- réplique vers profiles WHERE id = collaborators.user_id

-- Création automatique
auto_create_collaborator()
-- Quand un profile avec agency_id est créé/mis à jour,
-- crée automatiquement un collaborator lié
```

---

## Audit des usages dans le code

### Frontend (src/)

#### Fichiers lisant `collaborators.first_name/last_name/email`

| Fichier | Usage | Impact migration |
|---------|-------|------------------|
| `CollaboratorCard.tsx` | Affichage nom + initiales | 🟡 Moyen |
| `CollaboratorProfile.tsx` | Fiche détaillée collaborateur | 🟡 Moyen |
| `CollaboratorForm.tsx` | Formulaire création/édition | 🟠 Élevé |
| `CollaboratorList.tsx` | Liste + recherche | 🟡 Moyen |
| `GEDCollaboratorDropdown.tsx` | Dropdown sélection | 🟢 Faible |
| `CollaboratorsListWidget.tsx` | Widget dashboard | 🟢 Faible |
| `DemandesRHPage.tsx` | Liste demandes RH | 🟢 Faible |
| `GestionConges.tsx` | Page congés | 🟢 Faible |
| `RHAuditLogTable.tsx` | Journal d'audit RH | 🟢 Faible |
| `ToolFormDialog.tsx` | Formulaire outils | 🟢 Faible |
| `VehicleFormDialog.tsx` | Formulaire véhicules | 🟢 Faible |

#### Hooks concernés

| Hook | Usage colonnes dupliquées | Criticité |
|------|---------------------------|-----------|
| `useCollaborators.ts` | CRUD complet, SELECT * | 🔴 Critique |
| `useLeaveDecision.ts` | `first_name, last_name` pour notif | 🟡 Moyen |
| `useLeaveRequests.ts` | `agency_id` via collaborators | 🟡 Moyen |
| `usePersonalKpis.ts` | `apogee_user_id` | 🟡 Moyen |
| `useTechPlanning.ts` | `first_name, last_name, apogee_user_id` | 🟠 Élevé |
| `useRHAuditLog.ts` | Join sur collaborators | 🟢 Faible |
| `useFleetVehicles.ts` | Join collaborator name | 🟢 Faible |
| `useTools.ts` | Join collaborator name | 🟢 Faible |

### Edge Functions (supabase/functions/)

| Function | Usage | Impact |
|----------|-------|--------|
| `generate-hr-document` | `collaborators.first_name/last_name` | 🟠 Élevé |
| `generate-leave-decision` | Join collaborators(first_name, last_name) | 🟡 Moyen |
| `export-my-data` | Export identité depuis both tables | 🟡 Moyen |
| `export-rh-documents` | `collaborators.first_name/last_name` | 🟡 Moyen |
| `reset-user-password` | `profiles.first_name/last_name` only | 🟢 OK |
| `unified-search` | `profiles.first_name/last_name` only | 🟢 OK |

### État de la base de données

```
Total collaborators : 11
Avec user_id lié    : 10 (91%)
Sans user_id        : 1  (9%)

Incohérences identité (profiles ≠ collaborators) : 0 ✅
```

---

## Architecture cible (TO-BE)

### 1. Principe fondamental

> **1 donnée = 1 table propriétaire, les autres ne font que LIRE**

| Information | Table propriétaire | Qui édite |
|-------------|-------------------|-----------|
| Identité (nom, prénom) | `profiles` | User + Admin |
| Email de contact | `profiles` | User + Admin |
| Téléphone | `profiles` | User + Admin |
| Agence principale | `profiles.agency_id` | Admin |
| Apogee User ID | `profiles.apogee_user_id` | Admin |
| Global Role | `profiles.global_role` | Admin |
| Modules | `profiles.enabled_modules` | Admin |
| Données RH (type, role, dates) | `collaborators` | N2/RH |
| Données sensibles | `collaborator_sensitive_data` | RH Admin |

### 2. Schéma cible

```
┌─────────────────┐     ┌───────────────────────────────────────────────────────┐
│   auth.users    │────▶│                    profiles                           │
│  (Supabase)     │     │  - id (PK, FK → auth.users) ◀── OPTIONNEL            │
│                 │     │  - first_name, last_name, email, phone                │
│                 │     │  - agency_id, apogee_user_id                          │
│                 │     │  - global_role, enabled_modules                       │
└─────────────────┘     └───────────────────────────────────────────────────────┘
                                            │
                                            │ user_id (1:1)
                                            ▼
                        ┌───────────────────────────────────────────────────────┐
                        │                 collaborators                         │
                        │  - id (PK)                                            │
                        │  - user_id (FK → profiles, NOT NULL, UNIQUE)          │
                        │  - type, role, hiring_date, leaving_date              │
                        │  - address, postal_code, city, notes                  │
                        │  ✅ Plus de colonnes dupliquées                       │
                        └───────────────────────────────────────────────────────┘
```

### 3. Vue de compatibilité (Phase transitoire)

```sql
CREATE OR REPLACE VIEW collaborators_full AS
SELECT
  c.id,
  c.user_id,
  -- Identité tirée de profiles (source de vérité)
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.agency_id,
  p.apogee_user_id,
  -- Données RH pures
  c.type,
  c.role,
  c.hiring_date,
  c.leaving_date,
  c.address,
  c.postal_code,
  c.city,
  c.notes,
  c.created_at,
  c.updated_at
FROM collaborators c
LEFT JOIN profiles p ON p.id = c.user_id;
```

---

## Plan de migration

### Phase 0 - Sécurisation (P0) ✅ FAIT

- [x] Triggers de synchronisation bidirectionnelle en place
- [x] Vérification cohérence : 0 incohérences détectées
- [x] Auto-création collaborator sur nouveau profile avec agency_id

### Phase 1 - Vue de compatibilité (P1)

1. Créer la vue `collaborators_full`
2. Migrer progressivement les requêtes frontend vers la vue
3. Marquer les colonnes dupliquées comme `@deprecated`

### Phase 2 - Migration frontend (P1)

| Priorité | Fichier | Action |
|----------|---------|--------|
| 🔴 | `useCollaborators.ts` | Utiliser `collaborators_full` |
| 🟠 | `useTechPlanning.ts` | JOIN profiles pour identité |
| 🟠 | `CollaboratorForm.tsx` | Séparer update profiles vs update collaborators |
| 🟡 | Tous composants affichage | Utiliser `collaborators_full` |

### Phase 3 - Migration Edge Functions (P1)

| Function | Migration |
|----------|-----------|
| `generate-hr-document` | JOIN profiles pour identité |
| `generate-leave-decision` | JOIN profiles |
| `export-rh-documents` | JOIN profiles |

### Phase 4 - Nettoyage schéma (P2)

1. Supprimer triggers de synchronisation
2. Supprimer colonnes dupliquées :
   ```sql
   ALTER TABLE collaborators
     DROP COLUMN first_name,
     DROP COLUMN last_name,
     DROP COLUMN email,
     DROP COLUMN phone,
     DROP COLUMN apogee_user_id,
     DROP COLUMN agency_id;
   ```
3. Mettre à jour RLS policies

---

## Décisions architecturales

### Q: Que faire des collaborateurs sans `user_id` ?

**Décision** : Créer un `profiles` "fantôme" (sans lien auth.users) pour tout collaborateur.

- Même si le collaborateur ne se connecte jamais, il a un `profiles.id`
- Le `profiles` peut ne pas avoir de lien vers `auth.users`
- Assure le modèle 1:1 `profiles ↔ collaborators`

### Q: Qui est "owner" de l'identité ?

**Décision** : `profiles` est TOUJOURS la source de vérité pour l'identité.

- `collaborators` ne contient QUE des données RH
- Tout affichage d'identité passe par `profiles` ou `collaborators_full`

### Q: Comment gérer les écrans d'édition ?

| Écran | Table éditée | Champs |
|-------|--------------|--------|
| Mon Profil (self) | `profiles` | first_name, last_name, phone, avatar |
| Fiche Collaborateur (N2) | `collaborators` + readonly `profiles` | type, role, dates, adresse |
| Admin Users | `profiles` + `collaborators` | Tout (vue consolidée) |

---

## Métriques de suivi

| Métrique | Valeur actuelle | Cible |
|----------|-----------------|-------|
| Colonnes dupliquées | 6 | 0 |
| Fichiers utilisant doublons | 14 | 0 |
| Edge functions à migrer | 3 | 0 |
| Incohérences profiles/collaborators | 0 | 0 |
| Collaborateurs sans user_id | 1 | 0 |

---

*Document généré le 2024-12-09 - Architecture V1.0*
