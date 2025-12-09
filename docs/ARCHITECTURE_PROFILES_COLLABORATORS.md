# Architecture Identités & Collaborateurs - HelpConfort Services

## ADR (Architecture Decision Record)

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepté |
| **Version** | 1.1 |
| **Date** | 2024-12-09 |
| **Portée** | Gestion des identités et collaborateurs |
| **Auteur** | Équipe HelpConfort |

---

## 1. Contexte et problématique

### 1.1 Situation actuelle (AS-IS)

Le système actuel présente une **duplication de données identitaires** entre les tables `profiles` et `collaborators` :

```
┌─────────────────┐     ┌─────────────────────────────────────────────────────┐
│   auth.users    │────▶│                    profiles                         │
│  (Supabase)     │     │  - id (PK = auth.users.id)                          │
│                 │     │  - first_name, last_name, email, phone              │
│                 │     │  - agency_id, apogee_user_id                        │
│                 │     │  - global_role, enabled_modules                     │
└─────────────────┘     └─────────────────────────────────────────────────────┘
                                              │
                                              ▼ (user_id FK, NULLABLE)
                        ┌─────────────────────────────────────────────────────┐
                        │                  collaborators                      │
                        │  - id (PK)                                          │
                        │  - user_id (FK → profiles, NULLABLE, UNIQUE)        │
                        │  - first_name, last_name, email, phone ⚠️ DUPLIQUÉS │
                        │  - agency_id, apogee_user_id ⚠️ DUPLIQUÉS           │
                        │  - type, role, hiring_date, leaving_date            │
                        │  - address, postal_code, city, notes                │
                        └─────────────────────────────────────────────────────┘
                                              │
                                              ▼ (collaborator_id FK)
                        ┌─────────────────────────────────────────────────────┐
                        │           collaborator_sensitive_data               │
                        │  - birth_date_encrypted                             │
                        │  - social_security_number_encrypted                 │
                        │  - emergency_contact_encrypted                      │
                        └─────────────────────────────────────────────────────┘
```

### 1.2 Problèmes identifiés

| Problème | Impact | Priorité |
|----------|--------|----------|
| Duplication first_name, last_name, email, phone | Risque de désynchronisation, maintenance double | P0 |
| Duplication agency_id | RLS complexe, source d'erreurs | P0 |
| Duplication apogee_user_id | Incohérence potentielle avec Apogée | P1 |
| Triggers de sync bidirectionnels | Complexité, risque de boucle | P1 |
| collaborators.user_id nullable | Collaborateurs orphelins possibles | P2 |

### 1.3 Audit des usages actuels

**Fichiers impactés (14 fichiers front + 3 edge functions) :**

| Catégorie | Fichiers | Colonnes utilisées |
|-----------|----------|-------------------|
| Hooks RH | `useCollaborators.ts`, `useCollaborator.ts` | first_name, last_name, email, phone, agency_id |
| UI Collaborateurs | `CollaboratorForm.tsx`, `CollaboratorList.tsx`, `CollaboratorDetailsCard.tsx` | first_name, last_name, email, phone |
| StatIA | `useTechPlanning.ts`, `useTechniciensStatia.ts` | first_name, last_name (jointures) |
| Widgets | `CollaboratorsListWidget.tsx` | first_name, last_name, role, type |
| Edge Functions | `generate-hr-document`, `generate-leave-decision`, `export-rh-documents` | first_name, last_name, email |

---

## 2. Architecture cible (TO-BE)

### 2.1 Nouveau schéma

```
┌─────────────────┐     ┌─────────────────────────────────────────────────────┐
│   auth.users    │     │                    profiles                         │
│  (Supabase)     │     │  - id (PK, UUID autonome)                           │
│  - id (PK)      │◀────│  - auth_user_id (FK → auth.users.id, NULLABLE)      │
│  - email        │     │  - first_name, last_name, email, phone              │
│                 │     │  - agency_id, apogee_user_id                        │
│                 │     │  - global_role, enabled_modules                     │
└─────────────────┘     └─────────────────────────────────────────────────────┘
                                              │
                                              ▼ (user_id FK, NOT NULL, UNIQUE)
                        ┌─────────────────────────────────────────────────────┐
                        │                  collaborators                      │
                        │  - id (PK)                                          │
                        │  - user_id (FK → profiles.id, NOT NULL, UNIQUE)     │
                        │  - type, role                                       │
                        │  - hiring_date, leaving_date                        │
                        │  - address, postal_code, city, country              │
                        │  - notes                                            │
                        │  ⚠️ PLUS de first_name, last_name, email, etc.      │
                        └─────────────────────────────────────────────────────┘
                                              │
                                              ▼ (collaborator_id FK)
                        ┌─────────────────────────────────────────────────────┐
                        │           collaborator_sensitive_data               │
                        │  - birth_date_encrypted                             │
                        │  - social_security_number_encrypted                 │
                        │  - emergency_contact_encrypted                      │
                        └─────────────────────────────────────────────────────┘
```

### 2.2 Points clés du nouveau schéma

| Élément | Règle |
|---------|-------|
| `profiles.id` | PK autonome (UUID), **pas** de FK vers auth.users |
| `profiles.auth_user_id` | FK nullable vers `auth.users.id` - seul lien login ↔ profil |
| `collaborators.user_id` | FK **NOT NULL + UNIQUE** vers `profiles.id` |
| Identité | Exclusivement dans `profiles` (first_name, last_name, email, phone) |
| Rattachement agence | Exclusivement `profiles.agency_id` |
| Données RH | Exclusivement dans `collaborators` (type, role, dates, adresse) |

---

## 3. Vue de compatibilité : `collaborators_full`

### 3.1 Définition

```sql
CREATE OR REPLACE VIEW collaborators_full AS
SELECT
  c.id,
  c.user_id,
  -- Identité depuis profiles (source unique)
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.agency_id,
  p.apogee_user_id,
  -- Données RH depuis collaborators
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
INNER JOIN profiles p ON p.id = c.user_id;
```

### 3.2 Contrat d'utilisation

| Aspect | Décision |
|--------|----------|
| **Rôle** | Vue pérenne, contractuelle, API interne stable |
| **Durée de vie** | Permanente (pas temporaire) |
| **Usage front** | 90% des écrans RH passent par cette vue |
| **Exceptions** | Statistiques lourdes, agrégats StatIA (jointures explicites) |

**Règle d'or :**
> Le front ne doit **jamais** interroger directement `profiles` + `collaborators` en brut pour les écrans RH, mais passer par `collaborators_full` sauf cas très spécifiques.

---

## 4. Décisions architecturales

### 4.1 Source unique d'identité

> **L'identité métier (nom, prénom, email, téléphone, rattachement agence, apogee_user_id) est exclusivement portée par `profiles`.**

`collaborators` ne contient que des données RH (type, role, dates, adresse).

### 4.2 Lien login ↔ profil

> **`profiles.auth_user_id` est le SEUL lien vers `auth.users`.**

- Profil avec compte : `profiles.auth_user_id = auth.users.id`
- Profil sans compte (collaborateur fantôme, intérim) : `auth_user_id IS NULL`

### 4.3 Relation profiles ↔ collaborators (1:1 strict)

> **Tout `collaborators` doit avoir un `user_id` non nul.**

```sql
-- Contraintes à appliquer
ALTER TABLE collaborators
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE collaborators
  ADD CONSTRAINT collaborators_user_id_unique UNIQUE (user_id);

ALTER TABLE collaborators
  ADD CONSTRAINT collaborators_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
```

**Important :** `ON DELETE RESTRICT` (pas CASCADE) pour éviter d'effacer des fiches RH par erreur en supprimant un profil.

### 4.4 Profils "fantômes" (sans compte auth)

Pour les collaborateurs externes, intérimaires, ou anciens salariés :
1. Créer un `profiles` avec `auth_user_id = NULL`
2. Créer le `collaborators` lié à ce profil
3. Le collaborateur n'a pas d'accès login mais existe dans le système

### 4.5 Règles RLS cibles

> **Toutes les décisions d'autorisation par agence se basent sur `profiles.agency_id`.**

```sql
-- Exemple de policy collaborators (simplifié)
CREATE POLICY "collaborators_by_agency" ON collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM profiles p_me
    JOIN profiles p_coll ON p_coll.id = collaborators.user_id
    WHERE p_me.auth_user_id = auth.uid()
      AND p_me.agency_id = p_coll.agency_id
  )
);
```

**Règles :**
- RLS ne regarde plus `collaborators.agency_id` (colonne supprimée)
- Tout filtre d'agence passe par `profiles.agency_id`
- Jointure systématique via `collaborators.user_id → profiles.id`

---

## 5. Plan de migration (Checklist P0/P1/P2)

### P0 – Infrastructures minimales (CRITIQUE)

- [ ] **Migration profiles.auth_user_id**
  - Ajouter colonne `auth_user_id UUID NULLABLE` dans profiles
  - Migrer : `UPDATE profiles SET auth_user_id = id WHERE id IN (SELECT id FROM auth.users)`
  - Créer index : `CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id)`

- [ ] **Contraintes collaborators.user_id**
  - Backfill des user_id manquants (créer profiles fantômes si nécessaire)
  - `ALTER TABLE collaborators ALTER COLUMN user_id SET NOT NULL`
  - `ALTER TABLE collaborators ADD CONSTRAINT collaborators_user_id_unique UNIQUE (user_id)`

- [ ] **Vue collaborators_full**
  - Créer la vue SQL (voir section 3.1)
  - Tester les requêtes existantes

### P1 – Refactoring front / edge functions

- [ ] **useCollaborators.ts**
  - Migrer vers `from('collaborators_full')` ou jointure explicite
  - Supprimer références aux colonnes dupliquées

- [ ] **CollaboratorForm.tsx**
  - Séparer mutations : `profiles` (identité) + `collaborators` (RH)
  - Mettre à jour le formulaire pour refléter la séparation

- [ ] **useTechPlanning.ts / useTechniciensStatia.ts**
  - Identité via `profiles` ou `collaborators_full`
  - Jointures explicites pour StatIA

- [ ] **Edge functions HR**
  - `generate-hr-document` : join profiles pour identité
  - `generate-leave-decision` : join profiles pour identité
  - `export-rh-documents` : join profiles pour identité

- [ ] **Widgets / UI**
  - `CollaboratorsListWidget.tsx` → `collaborators_full`
  - `CollaboratorDetailsCard.tsx` → séparer identité/RH

### P2 – Nettoyage / durcissement

- [ ] **Suppression triggers de sync**
  - `sync_collaborator_on_profile_update`
  - `sync_profile_on_collaborator_update`
  - `auto_create_collaborator`

- [ ] **Drop colonnes dupliquées**
  ```sql
  ALTER TABLE collaborators
    DROP COLUMN first_name,
    DROP COLUMN last_name,
    DROP COLUMN email,
    DROP COLUMN phone,
    DROP COLUMN apogee_user_id,
    DROP COLUMN agency_id;
  ```

- [ ] **Mise à jour RLS**
  - Supprimer références à `collaborators.agency_id`
  - Simplifier policies avec jointure profiles

- [ ] **Vérification finale**
  - 0 références aux anciennes colonnes dans le code
  - 0 collaborators sans user_id
  - Tests de régression sur tous les écrans RH

---

## 6. Conséquences

### Positives

| Bénéfice | Description |
|----------|-------------|
| Source unique d'identité | `profiles` = seule vérité pour nom/prénom/email/phone |
| Simplification RLS | Toutes les policies basées sur `profiles.agency_id` |
| Alignement StatIA | Jointures cohérentes techniciens ↔ profiles |
| Compatibilité RH & Parc | Vue `collaborators_full` stable pour tous les modules |
| Profils fantômes | Support des collaborateurs sans compte auth |

### Négatives

| Contrainte | Mitigation |
|------------|------------|
| Migration front + edge à réaliser | Vue de compatibilité pour transition progressive |
| Passe QA sur tous les écrans RH | Checklist exhaustive, tests automatisés |
| Backfill des user_id manquants | Script de création profiles fantômes |

---

## 7. Métriques de suivi

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Collaborateurs avec user_id | 100% | 91% (10/11) |
| Fichiers migrés (front) | 14/14 | 0/14 |
| Edge functions migrées | 3/3 | 0/3 |
| Colonnes dupliquées supprimées | 6/6 | 0/6 |
| Triggers de sync supprimés | 3/3 | 0/3 |

---

*Document mis à jour le 2024-12-09 - Architecture V1.1*
