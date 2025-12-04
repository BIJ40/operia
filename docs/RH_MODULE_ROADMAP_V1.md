# ROADMAP TECHNIQUE – MODULE RH V1.0

> **Version:** 1.0  
> **Date:** 2025-12-04  
> **Statut:** Prêt pour implémentation  
> **Objectif:** Production-ready

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Plan d'action P0/P1/P2](#2-plan-daction-p0p1p2)
3. [Backlog complet](#3-backlog-complet)
4. [Mapping fichiers → actions](#4-mapping-fichiers--actions)
5. [Migrations SQL](#5-migrations-sql)
6. [Edge Functions](#6-edge-functions)
7. [Plan de tests E2E](#7-plan-de-tests-e2e)
8. [Plan de livraison](#8-plan-de-livraison)

---

## 1. VUE D'ENSEMBLE

### État actuel du module RH

| Composant | Statut | Complétude |
|-----------|--------|------------|
| Gestion collaborateurs | ✅ Opérationnel | 100% |
| Fusion Profile↔Collaborator | ✅ Opérationnel | 100% |
| GED collaborateur | ✅ Opérationnel | 90% |
| Coffre-fort salarié | ✅ Opérationnel | 85% |
| Workflow demandes RH | ⚠️ Partiel | 70% |
| PDF tamponné | ❌ Manquant | 0% |
| Notifications RH | ❌ Manquant | 0% |
| Sécurité Storage | ⚠️ Partiel | 60% |

### Objectif V1.0

Livrer un module RH **production-ready** avec :
- Génération PDF tamponné automatique
- Système de notifications bidirectionnel (salarié ↔ RH)
- Sécurité Storage renforcée (signed URLs)
- Verrou concurrentiel sur demandes RH
- Historique complet des actions

---

## 2. PLAN D'ACTION P0/P1/P2

---

### 🔴 P0 – IMPLÉMENTATION CRITIQUE

#### RH-P0-01 — Génération PDF tamponné

**Description:**  
Lors du traitement d'une demande RH (attestation, certificat), générer automatiquement un PDF avec tampon officiel de l'agence, signature du validateur et date de génération.

**Objectifs:**
- Générer des documents RH officiels et authentifiés
- Automatiser le dépôt dans le coffre-fort du salarié
- Traçabilité complète (qui a validé, quand)

**Fichiers à modifier:**
```
src/hooks/rh/useDocumentRequests.ts          # Ajout appel edge function
src/components/rh/DocumentRequestActions.tsx  # Nouveau - Actions validation
src/pages/hc-agency/demandes-rh/index.tsx    # Intégration actions
```

**Edge function à créer:**
```
supabase/functions/generate-hr-pdf/index.ts
```

**Dépendances:**
- `pdf-lib` (manipulation PDF)
- Table `agency_stamps` (tampons agences)
- Bucket `rh-documents` existant

**Migrations SQL:**
```sql
-- Colonne pour stocker le chemin du PDF généré
ALTER TABLE hr_generated_documents 
ADD COLUMN IF NOT EXISTS stamp_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stamp_file_path text;
```

**Critères DONE:**
- [ ] Edge function génère PDF avec tampon
- [ ] Tampon = logo agence + nom validateur + date
- [ ] PDF déposé automatiquement dans coffre-fort
- [ ] Document lié à la demande RH originale
- [ ] Tests unitaires edge function

**Pièges potentiels:**
- Tampons non uploadés pour certaines agences → fallback texte
- Taille fichier PDF trop importante → compression
- Timeout edge function sur gros documents → chunking

---

#### RH-P0-02 — Système de notifications RH

**Description:**  
Créer un système de notifications bidirectionnel permettant aux salariés d'être informés du traitement de leurs demandes, et aux RH d'être alertés des nouvelles demandes.

**Objectifs:**
- Notification en temps réel dans l'app
- Badge compteur dans le header
- Email optionnel (configurable)
- Historique des notifications

**Fichiers à modifier:**
```
src/components/layout/UnifiedHeader.tsx       # Badge notifications
src/components/notifications/                  # Nouveau dossier
  ├── NotificationBell.tsx                    # Composant cloche
  ├── NotificationDropdown.tsx                # Liste déroulante
  ├── NotificationItem.tsx                    # Item individuel
  └── useNotifications.ts                     # Hook données
src/pages/mon-coffre-rh/index.tsx             # Affichage alertes
src/pages/hc-agency/demandes-rh/index.tsx     # Trigger notifications
```

**Edge function à créer:**
```
supabase/functions/notify-rh-event/index.ts   # Envoi notifications + email
```

**Migrations SQL:**
```sql
-- Table notifications RH
CREATE TABLE rh_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  sender_id uuid REFERENCES profiles(id),
  type text NOT NULL, -- 'request_created', 'request_completed', 'request_rejected', 'document_available'
  title text NOT NULL,
  message text,
  reference_type text, -- 'document_request', 'document', 'collaborator'
  reference_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_rh_notifications_recipient ON rh_notifications(recipient_id, is_read);
CREATE INDEX idx_rh_notifications_created ON rh_notifications(created_at DESC);

-- RLS
ALTER TABLE rh_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
ON rh_notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark own as read"
ON rh_notifications FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Trigger pour notifier automatiquement
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notification au salarié quand statut change
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('COMPLETED', 'REJECTED') THEN
    INSERT INTO rh_notifications (
      recipient_id,
      sender_id,
      type,
      title,
      message,
      reference_type,
      reference_id
    )
    SELECT 
      c.user_id,
      NEW.processed_by,
      CASE NEW.status 
        WHEN 'COMPLETED' THEN 'request_completed'
        WHEN 'REJECTED' THEN 'request_rejected'
      END,
      CASE NEW.status
        WHEN 'COMPLETED' THEN 'Votre demande a été traitée'
        WHEN 'REJECTED' THEN 'Votre demande a été refusée'
      END,
      NEW.response_note,
      'document_request',
      NEW.id
    FROM collaborators c
    WHERE c.id = NEW.collaborator_id
    AND c.user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notify_request_status
AFTER UPDATE ON document_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_request_status_change();
```

**Critères DONE:**
- [ ] Table rh_notifications créée avec RLS
- [ ] Trigger automatique sur changement statut
- [ ] Badge compteur dans header (non-lues)
- [ ] Dropdown liste notifications
- [ ] Mark as read fonctionnel
- [ ] Email optionnel via edge function

**Pièges potentiels:**
- Performance si trop de notifications → pagination
- Spam notifications → debounce/groupement
- Emails bloqués → queue avec retry

---

#### RH-P0-03 — Verrou concurrentiel demandes RH

**Description:**  
Empêcher deux utilisateurs RH de traiter la même demande simultanément via un système de verrouillage optimiste.

**Objectifs:**
- Éviter conflits de mise à jour
- UX claire (demande verrouillée par X)
- Timeout automatique du verrou (15min)

**Fichiers à modifier:**
```
src/hooks/rh/useDocumentRequests.ts           # Lock/unlock logic
src/components/rh/DocumentRequestItem.tsx     # Affichage état lock
src/pages/hc-agency/demandes-rh/index.tsx     # Gestion lock
```

**Migrations SQL:**
```sql
-- Colonnes de verrouillage
ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Fonction de verrouillage atomique
CREATE OR REPLACE FUNCTION lock_document_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_success boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Tenter le verrouillage (seulement si non verrouillé ou verrou expiré > 15min)
  UPDATE document_requests
  SET 
    locked_by = v_user_id,
    locked_at = now()
  WHERE id = p_request_id
    AND (
      locked_by IS NULL 
      OR locked_by = v_user_id
      OR locked_at < now() - INTERVAL '15 minutes'
    )
  RETURNING true INTO v_success;
  
  RETURN COALESCE(v_success, false);
END;
$$;

-- Fonction de déverrouillage
CREATE OR REPLACE FUNCTION unlock_document_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE document_requests
  SET 
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_request_id
    AND locked_by = auth.uid();
    
  RETURN FOUND;
END;
$$;
```

**Critères DONE:**
- [ ] Colonnes locked_by/locked_at ajoutées
- [ ] RPC lock_document_request fonctionnel
- [ ] RPC unlock_document_request fonctionnel
- [ ] UI affiche "Verrouillé par X" si applicable
- [ ] Timeout 15min automatique
- [ ] Déverrouillage automatique à la fermeture

**Pièges potentiels:**
- Utilisateur ferme navigateur sans unlock → timeout gère
- Double-click rapide → debounce côté client
- Conflit sur même milliseconde → atomicité SQL

---

#### RH-P0-04 — Renforcement sécurité Storage

**Description:**  
Remplacer les URLs publiques par des signed URLs avec expiration courte (15min) pour tous les documents RH.

**Objectifs:**
- Aucun accès direct aux fichiers RH
- URLs temporaires signées
- Audit trail des accès

**Fichiers à modifier:**
```
src/hooks/rh/useMyDocuments.ts                # Signed URL generation
src/hooks/rh/useCollaboratorDocuments.ts      # Signed URL generation
src/components/rh/HRDocumentManager.tsx       # Preview avec signed URL
src/components/rh/viewer/ReadOnlyDocumentItem.tsx # Download avec signed URL
```

**Migrations SQL:**
```sql
-- Table audit accès documents
CREATE TABLE document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES collaborator_documents(id),
  accessed_by uuid REFERENCES profiles(id) NOT NULL,
  access_type text NOT NULL, -- 'view', 'download', 'preview'
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index pour audit
CREATE INDEX idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user ON document_access_logs(accessed_by);

-- RLS (lecture admin uniquement)
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access logs"
ON document_access_logs FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- Fonction pour créer signed URL + log
CREATE OR REPLACE FUNCTION get_signed_document_url(
  p_document_id uuid,
  p_access_type text DEFAULT 'view'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file_path text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Récupérer le chemin du fichier
  SELECT file_path INTO v_file_path
  FROM collaborator_documents
  WHERE id = p_document_id;
  
  IF v_file_path IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;
  
  -- Logger l'accès
  INSERT INTO document_access_logs (document_id, accessed_by, access_type)
  VALUES (p_document_id, v_user_id, p_access_type);
  
  -- Retourner le chemin (le client appellera createSignedUrl)
  RETURN v_file_path;
END;
$$;
```

**Critères DONE:**
- [ ] Toutes les URLs documents sont signées
- [ ] Expiration 15 minutes
- [ ] Table audit créée et alimentée
- [ ] Aucun accès public possible
- [ ] Preview fonctionne avec signed URL

**Pièges potentiels:**
- Cache navigateur avec ancienne URL → headers no-cache
- URL expirée pendant visualisation → refresh automatique
- Performance sur beaucoup de documents → batch signing

---

#### RH-P0-05 — Validation RLS complète

**Description:**  
Audit et correction de toutes les policies RLS du module RH pour garantir l'isolation multi-agence.

**Objectifs:**
- Aucune fuite de données inter-agences
- Respect du modèle 3-tiers (coffre/rh_viewer/rh_admin)
- Superadmin bypass fonctionnel

**Fichiers à vérifier:**
```
Tables concernées:
- collaborators
- collaborator_documents
- document_requests
- employment_contracts
- salary_history
- payslip_data
- rh_notifications (nouveau)
- document_access_logs (nouveau)
```

**Migrations SQL:**
```sql
-- Audit et correction RLS collaborators
DROP POLICY IF EXISTS "Users can view collaborators in their agency" ON collaborators;
CREATE POLICY "Users can view collaborators in their agency"
ON collaborators FOR SELECT
USING (
  -- Superadmin voit tout
  has_min_global_role(auth.uid(), 6)
  OR
  -- RH de l'agence voit tous les collaborateurs
  (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2) -- Dirigeant+
      OR has_agency_rh_role(auth.uid(), agency_id)
    )
  )
  OR
  -- Salarié voit son propre profil
  user_id = auth.uid()
);

-- Audit et correction RLS collaborator_documents
DROP POLICY IF EXISTS "RH can view agency documents" ON collaborator_documents;
CREATE POLICY "RH can view agency documents"
ON collaborator_documents FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR
  (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_agency_rh_role(auth.uid(), agency_id)
    )
  )
  OR
  (
    collaborator_id = get_current_collaborator_id()
    AND visibility = 'EMPLOYEE_VISIBLE'
  )
);

-- Vérifier que salary_history est strictement protégé
DROP POLICY IF EXISTS "Only RH admin can view salary" ON salary_history;
CREATE POLICY "Only RH admin can view salary"
ON salary_history FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR
  (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      -- Uniquement rh_admin, pas rh_viewer
      (
        SELECT (enabled_modules->'rh'->'options'->>'rh_admin')::boolean
        FROM profiles WHERE id = auth.uid()
      ) = true
      OR has_min_global_role(auth.uid(), 2) -- Dirigeant de l'agence
    )
  )
);
```

**Critères DONE:**
- [ ] Toutes les tables RH ont des RLS actives
- [ ] Test isolation agence A ne voit pas agence B
- [ ] Test rh_viewer ne voit pas salaires
- [ ] Test salarié voit uniquement ses documents EMPLOYEE_VISIBLE
- [ ] Test superadmin voit tout

**Pièges potentiels:**
- Policies qui se chevauchent → tester exhaustivement
- get_user_agency_id() null → gérer le cas
- Performance sur grosses tables → index appropriés

---

### 🟠 P1 – STABILISATION & INDUSTRIALISATION

#### RH-P1-01 — Historique complet des actions RH

**Description:**  
Créer un journal d'audit complet de toutes les actions RH (création, modification, suppression, traitement demandes).

**Objectifs:**
- Traçabilité complète
- Interface admin de consultation
- Export pour audit externe

**Fichiers à créer/modifier:**
```
src/components/rh/admin/RHAuditLog.tsx        # Nouveau - Interface consultation
src/hooks/rh/useRHAuditLog.ts                 # Nouveau - Hook données
src/pages/hc-agency/rh-admin/index.tsx        # Ajout onglet audit
```

**Migrations SQL:**
```sql
CREATE TABLE rh_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES apogee_agencies(id) NOT NULL,
  actor_id uuid REFERENCES profiles(id) NOT NULL,
  action_type text NOT NULL, -- 'document_upload', 'document_delete', 'request_process', 'salary_update', etc.
  target_type text NOT NULL, -- 'collaborator', 'document', 'request', 'contract', 'salary'
  target_id uuid NOT NULL,
  target_label text, -- Libellé lisible
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rh_audit_log_agency ON rh_audit_log(agency_id, created_at DESC);
CREATE INDEX idx_rh_audit_log_actor ON rh_audit_log(actor_id);
CREATE INDEX idx_rh_audit_log_target ON rh_audit_log(target_type, target_id);

ALTER TABLE rh_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH admin can view agency audit log"
ON rh_audit_log FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  )
);
```

**Critères DONE:**
- [ ] Table rh_audit_log créée
- [ ] Triggers sur toutes les tables RH
- [ ] Interface consultation admin
- [ ] Filtres par type, acteur, période
- [ ] Export CSV/JSON

---

#### RH-P1-02 — Validation stricte fichiers upload

**Description:**  
Valider systématiquement les fichiers uploadés (type MIME, taille, contenu suspect).

**Objectifs:**
- Sécurité upload renforcée
- Feedback utilisateur clair
- Blocage fichiers malveillants

**Fichiers à modifier:**
```
src/components/rh/HRDocumentManager.tsx       # Validation client
src/hooks/rh/useDocumentUpload.ts             # Validation + upload
supabase/functions/validate-rh-document/      # Validation serveur
```

**Critères DONE:**
- [ ] Validation MIME type (PDF, images, documents Office)
- [ ] Limite taille 20MB
- [ ] Scan antivirus basique (magic bytes)
- [ ] Messages d'erreur explicites
- [ ] Logs des rejets

---

#### RH-P1-03 — Statut IN_PROGRESS réellement utilisé

**Description:**  
Implémenter le statut IN_PROGRESS pour les demandes en cours de traitement.

**Fichiers à modifier:**
```
src/hooks/rh/useDocumentRequests.ts           # Transition PENDING → IN_PROGRESS
src/components/rh/DocumentRequestItem.tsx     # UI état IN_PROGRESS
```

**Critères DONE:**
- [ ] Bouton "Prendre en charge" → IN_PROGRESS
- [ ] IN_PROGRESS visible côté salarié
- [ ] Retour PENDING possible si abandon

---

#### RH-P1-04 — Retry & monitoring analyse bulletins

**Description:**  
Améliorer la robustesse de l'analyse IA des bulletins de paie avec retry automatique et monitoring.

**Fichiers à modifier:**
```
supabase/functions/analyze-payslip/index.ts   # Ajout retry logic
src/hooks/rh/useAnalyzePayslip.ts             # Queue + status
src/components/rh/PayslipAnalysisStatus.tsx   # Nouveau - UI status
```

**Critères DONE:**
- [ ] 3 retries automatiques
- [ ] Statut visible (pending/processing/success/failed)
- [ ] Logs erreurs Sentry
- [ ] Notification si échec définitif

---

### 🟡 P2 – AMÉLIORATIONS UX & CONFORT

#### RH-P2-01 — Sous-dossiers persistants en base

**Description:**  
Migrer les sous-dossiers de localStorage vers la base de données.

**Migrations SQL:**
```sql
CREATE TABLE collaborator_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid REFERENCES collaborators(id) NOT NULL,
  parent_folder_id uuid REFERENCES collaborator_document_folders(id),
  name text NOT NULL,
  doc_type text, -- Catégorie parente
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(collaborator_id, parent_folder_id, name)
);
```

**Critères DONE:**
- [ ] Table folders créée
- [ ] Migration localStorage → base
- [ ] CRUD dossiers fonctionnel
- [ ] Synchronisation multi-utilisateurs

---

#### RH-P2-02 — Recherche documents full-text

**Description:**  
Recherche textuelle sur titre, description, contenu OCR des documents.

**Migrations SQL:**
```sql
ALTER TABLE collaborator_documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_documents_search ON collaborator_documents USING GIN(search_vector);

CREATE FUNCTION update_document_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.file_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_document_search
BEFORE INSERT OR UPDATE ON collaborator_documents
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();
```

**Critères DONE:**
- [ ] Index tsvector créé
- [ ] Champ recherche dans UI
- [ ] Résultats instantanés
- [ ] Highlighting des termes trouvés

---

#### RH-P2-03 — Export ZIP + CSV

**Description:**  
Permettre l'export groupé de documents (ZIP) et l'export de données (CSV).

**Edge function:**
```
supabase/functions/export-rh-documents/index.ts
```

**Critères DONE:**
- [ ] Export ZIP documents sélectionnés
- [ ] Export CSV liste collaborateurs
- [ ] Export CSV historique demandes
- [ ] Limitation taille (max 100MB)

---

#### RH-P2-04 — Dashboard RH (statistiques)

**Description:**  
Tableau de bord avec métriques RH clés.

**Fichiers à créer:**
```
src/pages/hc-agency/rh-dashboard/index.tsx
src/components/rh/dashboard/
  ├── RHStatsCards.tsx
  ├── DocumentsChart.tsx
  ├── RequestsTimeline.tsx
  └── CollaboratorsOverview.tsx
```

**Métriques:**
- Effectif par type de contrat
- Documents par catégorie
- Demandes en attente/traitées
- Temps moyen de traitement

**Critères DONE:**
- [ ] Page dashboard créée
- [ ] 4+ widgets statistiques
- [ ] Filtres période
- [ ] Export PDF rapport

---

## 3. BACKLOG COMPLET

### 🔴 P0 – Production Blocking

| ID | Titre | Effort | Dépendances |
|----|-------|--------|-------------|
| RH-P0-01 | Génération PDF tamponné | 3j | agency_stamps |
| RH-P0-02 | Notifications RH (table + UI) | 4j | - |
| RH-P0-03 | Lock concurrentiel demandes | 1j | - |
| RH-P0-04 | Renforcement sécurité Storage | 2j | - |
| RH-P0-05 | Validation RLS complète | 2j | - |

**Total P0:** ~12 jours

### 🟠 P1 – Stabilisation

| ID | Titre | Effort | Dépendances |
|----|-------|--------|-------------|
| RH-P1-01 | Historique actions RH | 3j | - |
| RH-P1-02 | Validation fichiers upload | 2j | - |
| RH-P1-03 | Statut IN_PROGRESS | 0.5j | RH-P0-03 |
| RH-P1-04 | Retry analyse bulletins | 1j | - |

**Total P1:** ~6.5 jours

### 🟡 P2 – Améliorations

| ID | Titre | Effort | Dépendances |
|----|-------|--------|-------------|
| RH-P2-01 | Sous-dossiers en base | 2j | - |
| RH-P2-02 | Recherche full-text | 2j | - |
| RH-P2-03 | Export ZIP + CSV | 2j | - |
| RH-P2-04 | Dashboard RH | 4j | - |

**Total P2:** ~10 jours

---

## 4. MAPPING FICHIERS → ACTIONS

### Fichiers existants à modifier

```
src/hooks/rh/
├── useDocumentRequests.ts      # P0-01, P0-03, P1-03
├── useMyDocuments.ts           # P0-04
├── useCollaboratorDocuments.ts # P0-04
├── useAnalyzePayslip.ts        # P1-04
└── useDocumentUpload.ts        # P1-02 (nouveau)

src/components/rh/
├── HRDocumentManager.tsx       # P0-04, P1-02
├── DocumentRequestItem.tsx     # P0-03, P1-03
├── viewer/
│   └── ReadOnlyDocumentItem.tsx # P0-04
└── PayslipDataViewer.tsx       # P1-04

src/pages/
├── mon-coffre-rh/index.tsx     # P0-02
└── hc-agency/demandes-rh/index.tsx # P0-01, P0-02, P0-03
```

### Nouveaux fichiers à créer

```
src/components/notifications/
├── NotificationBell.tsx        # P0-02
├── NotificationDropdown.tsx    # P0-02
├── NotificationItem.tsx        # P0-02
└── useNotifications.ts         # P0-02

src/components/rh/
├── DocumentRequestActions.tsx  # P0-01
├── admin/
│   └── RHAuditLog.tsx          # P1-01
├── PayslipAnalysisStatus.tsx   # P1-04
└── dashboard/                  # P2-04
    ├── RHStatsCards.tsx
    ├── DocumentsChart.tsx
    ├── RequestsTimeline.tsx
    └── CollaboratorsOverview.tsx

src/hooks/rh/
├── useRHAuditLog.ts            # P1-01
└── useDocumentUpload.ts        # P1-02

src/pages/hc-agency/
├── rh-admin/index.tsx          # P1-01
└── rh-dashboard/index.tsx      # P2-04

supabase/functions/
├── generate-hr-pdf/index.ts    # P0-01
├── notify-rh-event/index.ts    # P0-02
├── validate-rh-document/index.ts # P1-02
└── export-rh-documents/index.ts  # P2-03
```

---

## 5. MIGRATIONS SQL

### Migration P0 complète

```sql
-- =============================================
-- MIGRATION RH MODULE V1.0 - P0
-- =============================================

-- 1. Notifications RH
CREATE TABLE IF NOT EXISTS rh_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  sender_id uuid REFERENCES profiles(id),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  reference_type text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rh_notifications_recipient ON rh_notifications(recipient_id, is_read);
CREATE INDEX idx_rh_notifications_created ON rh_notifications(created_at DESC);

ALTER TABLE rh_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
ON rh_notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark own as read"
ON rh_notifications FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON rh_notifications FOR INSERT
WITH CHECK (true);

-- 2. Lock concurrentiel
ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- 3. Audit accès documents
CREATE TABLE IF NOT EXISTS document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES collaborator_documents(id),
  accessed_by uuid REFERENCES profiles(id) NOT NULL,
  access_type text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user ON document_access_logs(accessed_by);

ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access logs"
ON document_access_logs FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "System can insert access logs"
ON document_access_logs FOR INSERT
WITH CHECK (true);

-- 4. Fonctions RPC
CREATE OR REPLACE FUNCTION lock_document_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_success boolean;
BEGIN
  v_user_id := auth.uid();
  
  UPDATE document_requests
  SET 
    locked_by = v_user_id,
    locked_at = now()
  WHERE id = p_request_id
    AND (
      locked_by IS NULL 
      OR locked_by = v_user_id
      OR locked_at < now() - INTERVAL '15 minutes'
    )
  RETURNING true INTO v_success;
  
  RETURN COALESCE(v_success, false);
END;
$$;

CREATE OR REPLACE FUNCTION unlock_document_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE document_requests
  SET 
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_request_id
    AND locked_by = auth.uid();
    
  RETURN FOUND;
END;
$$;

-- 5. Trigger notifications automatiques
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('COMPLETED', 'REJECTED') THEN
    INSERT INTO rh_notifications (
      recipient_id,
      sender_id,
      type,
      title,
      message,
      reference_type,
      reference_id
    )
    SELECT 
      c.user_id,
      NEW.processed_by,
      CASE NEW.status 
        WHEN 'COMPLETED' THEN 'request_completed'
        WHEN 'REJECTED' THEN 'request_rejected'
      END,
      CASE NEW.status
        WHEN 'COMPLETED' THEN 'Votre demande a été traitée'
        WHEN 'REJECTED' THEN 'Votre demande a été refusée'
      END,
      NEW.response_note,
      'document_request',
      NEW.id
    FROM collaborators c
    WHERE c.id = NEW.collaborator_id
    AND c.user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_request_status ON document_requests;
CREATE TRIGGER tr_notify_request_status
AFTER UPDATE ON document_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_request_status_change();
```

---

## 6. EDGE FUNCTIONS

### generate-hr-pdf/index.ts

```typescript
// Voir implémentation détaillée dans supabase/functions/generate-hr-pdf/index.ts
// Fonctionnalités:
// - Charge le template PDF selon le type de document
// - Applique le tampon de l'agence (logo + signature)
// - Ajoute nom du validateur + date
// - Sauvegarde dans Storage bucket rh-documents
// - Met à jour la demande avec le chemin du fichier
```

### notify-rh-event/index.ts

```typescript
// Voir implémentation détaillée dans supabase/functions/notify-rh-event/index.ts
// Fonctionnalités:
// - Crée notification en base
// - Envoie email optionnel via Resend
// - Gère les templates de notification par type
```

---

## 7. PLAN DE TESTS E2E

### Tests Salarié

| ID | Scénario | Étapes | Résultat attendu |
|----|----------|--------|------------------|
| T-SAL-01 | Création demande | 1. Login salarié 2. Aller coffre RH 3. Créer demande attestation | Demande créée, statut PENDING |
| T-SAL-02 | Réception notification | 1. RH traite demande 2. Salarié rafraîchit | Badge notification, dropdown affiche message |
| T-SAL-03 | Téléchargement PDF | 1. Cliquer notification 2. Voir document 3. Télécharger | PDF avec tampon visible, download OK |
| T-SAL-04 | Marquer comme lu | 1. Cliquer "Marquer comme lu" | Badge décrémenté, notification disparaît |

### Tests RH

| ID | Scénario | Étapes | Résultat attendu |
|----|----------|--------|------------------|
| T-RH-01 | Verrouillage demande | 1. Login RH 2. Ouvrir demande | Demande verrouillée, autre RH voit "Verrouillé par X" |
| T-RH-02 | Génération PDF | 1. Traiter demande 2. Générer attestation | PDF créé avec tampon agence |
| T-RH-03 | Dépôt coffre-fort | 1. Après génération | Document visible dans coffre salarié |
| T-RH-04 | Changement statut | 1. Marquer COMPLETED | Notification envoyée au salarié |
| T-RH-05 | Timeout verrou | 1. Attendre 16min | Demande déverrouillée automatiquement |

### Tests Multi-Agence (Isolation)

| ID | Scénario | Étapes | Résultat attendu |
|----|----------|--------|------------------|
| T-ISO-01 | RH agence A | 1. Login RH agence A 2. Lister collaborateurs | Voit uniquement collaborateurs agence A |
| T-ISO-02 | Demandes agence B | 1. Login RH agence A 2. Tenter accès demande agence B via URL | Erreur 403, redirection |
| T-ISO-03 | Documents agence B | 1. Login salarié agence A 2. Tenter accès document agence B | Erreur, document non trouvé |

### Tests RLS

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| T-RLS-01 | Salarié accès propres docs | Uniquement EMPLOYEE_VISIBLE |
| T-RLS-02 | rh_viewer accès salaires | Accès refusé |
| T-RLS-03 | rh_admin accès salaires | Accès autorisé |
| T-RLS-04 | Superadmin accès tout | Accès autorisé tous agences |

### Tests Storage

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| T-STO-01 | URL signée valide | Document s'affiche |
| T-STO-02 | URL signée expirée (>15min) | Erreur 403, demande refresh |
| T-STO-03 | URL non signée | Accès refusé |

---

## 8. PLAN DE LIVRAISON

### Phase 1 – Développement P0 (2 semaines)

| Semaine | Tâches | Livrables |
|---------|--------|-----------|
| S1 | RH-P0-02 Notifications, RH-P0-03 Lock | Table notifications, UI badge, lock RPC |
| S2 | RH-P0-01 PDF tamponné, RH-P0-04 Storage | Edge function PDF, signed URLs |

### Phase 2 – QA Interne (1 semaine)

| Jour | Focus | Responsable |
|------|-------|-------------|
| J1-2 | Tests E2E salarié | QA |
| J3-4 | Tests E2E RH + isolation | QA |
| J5 | Tests RLS + Storage | Dev |

### Phase 3 – Beta Agences Pilotes (2 semaines)

| Semaine | Actions |
|---------|---------|
| S1 | Déploiement 3 agences pilotes, monitoring Sentry |
| S2 | Collecte feedback, correctifs mineurs |

### Phase 4 – Correctifs & Stabilisation (1 semaine)

| Jour | Focus |
|------|-------|
| J1-3 | Correction bugs critiques |
| J4-5 | Documentation utilisateur, formation |

### Phase 5 – Production V1 (1 jour)

| Étape | Action |
|-------|--------|
| 1 | Migration production |
| 2 | Activation toutes agences |
| 3 | Monitoring intensif 48h |

---

## RÉCAPITULATIF

| Phase | Durée | Effort |
|-------|-------|--------|
| P0 Développement | 2 sem | 12j |
| QA Interne | 1 sem | 5j |
| Beta Pilotes | 2 sem | 10j |
| Stabilisation | 1 sem | 5j |
| Production | 1 jour | 1j |
| **TOTAL** | **~7 semaines** | **~33j** |

---

**Statut:** ✅ Prêt pour lancement P0  
**Prochaine action:** Implémenter RH-P0-02 (Notifications) + RH-P0-03 (Lock)

---

*Document généré le 2025-12-04*
