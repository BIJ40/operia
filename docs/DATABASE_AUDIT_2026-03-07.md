# 🗄️ AUDIT BASE DE DONNÉES — 7 Mars 2026

**Auditeur** : Expert DBA / Architecte Supabase (IA)  
**Version** : V0.9.1  
**Scope** : 181 tables, 397 migrations, ~246 RLS policies, relations, index, contraintes

---

## 📊 DATABASE SCORE : 6.8 / 10

| Critère | Note | Poids | Commentaire |
|---------|------|-------|-------------|
| Normalisation | 7/10 | 20% | Bon overall, quelques JSONB abusifs |
| Indexation | 6/10 | 20% | 65+ FK sans index — performance JOINs |
| RLS / Sécurité | 7/10 | 20% | Complètes mais 1 policy `USING(true)` sur INSERT |
| Contraintes d'intégrité | 7/10 | 15% | FK bien posées, manque CHECK constraints |
| Migrations | 5/10 | 10% | 397 fichiers — fragmentation excessive |
| Isolation multi-tenant | 6/10 | 15% | ~130 tables sans FK vers agencies |

---

## 1. INVENTAIRE GÉNÉRAL

### 1.1 Statistiques globales

| Métrique | Valeur |
|----------|--------|
| **Tables** | 181 |
| **Migrations** | 397 |
| **RLS Policies** | ~246 |
| **Colonnes JSONB** | 78 |
| **FK sans index** | 65+ |
| **Tables > 1 MB** | 12 |
| **Plus grosse table** | `blocks` (24 MB, 317 rows → BLOB HTML) |
| **Plus de rows** | `user_connection_logs` (21 670 rows, 6.4 MB) |

### 1.2 Top 10 tables par taille

| Table | Taille | Rows estimés | Commentaire |
|-------|--------|-------------|-------------|
| `blocks` | 24 MB | 317 | Contenu HTML lourd — BLOB |
| `guide_chunks` | 16 MB | 1205 | Chunks RAG + embeddings |
| `formation_content` | 13 MB | 140 | Contenu formation (BLOB) |
| `user_connection_logs` | 6.4 MB | 21 670 | Logs connexion — croissance rapide |
| `knowledge_base` | 3 MB | ~100 | Base de connaissances |
| `ticket_embeddings` | 2.6 MB | 201 | Vecteurs embeddings |
| `prospect_pool` | 1.8 MB | 1940 | Pool prospects |
| `metrics_apporteur_univers_daily` | 1.5 MB | 8212 | Métriques — croissance rapide |
| `apogee_tickets` | 1.2 MB | 740 | Tickets (35+ colonnes) |
| `metrics_apporteur_daily` | 832 KB | 4100 | Métriques — croissance rapide |

---

## 2. PROBLÈMES D'INDEXATION

### 2.1 Foreign Keys sans index — 🔴 CRITIQUE

**65+ colonnes FK n'ont aucun index.** Cela impacte les performances des JOINs et des DELETE CASCADE.

#### Tables les plus impactées (par taille) :

| Table | Colonne FK | Taille table | Impact |
|-------|-----------|-------------|--------|
| `apogee_tickets` | `created_by_user_id` | 680 KB | 🔴 Élevé — 740 rows, JOINs fréquents |
| `apogee_ticket_comments` | `created_by_user_id` | 168 KB | 🔴 Élevé — 668 rows |
| `faq_items` | `category_id` | 112 KB | 🟠 Modéré — 300 rows |
| `faq_items` | `created_from_query_id` | 112 KB | 🟡 Faible |
| `chatbot_queries` | `reviewed_by` | 112 KB | 🟡 Faible |
| `apogee_ticket_attachments` | `ticket_id` | 16 KB | 🟠 Croissance potentielle |
| `user_modules` | `enabled_by` | 16 KB | 🟡 Faible |
| `feature_flags` | `updated_by` | 16 KB | 🟡 Faible |
| `collaborators` | `created_by` | 8 KB | 🟡 Faible (pour l'instant) |
| `fleet_vehicles` | `assigned_collaborator_id` | 8 KB | 🟡 Faible |
| `media_links` | `agency_id` | 8 KB | 🟠 Croissance avec médiathèque |
| `unified_notifications` | `agency_id` | 8 KB | 🟠 Croissance rapide potentielle |
| `planning_suggestions` | `agency_id` | 8 KB | 🟡 |
| `prospect_cards` | `pool_prospect_id` | 8 KB | 🟡 |

#### Toutes les FK manquantes (tables 0 bytes — nouvelles tables) :

| Table | Colonnes FK sans index |
|-------|----------------------|
| `epi_assignments` | `assigned_by_user_id`, `catalog_item_id` |
| `epi_documents` | `ack_id` |
| `epi_incidents` | `assignment_id`, `catalog_item_id`, `handled_by_user_id` |
| `epi_incident_attachments` | `incident_id`, `uploaded_by` |
| `epi_monthly_ack_items` | `ack_id`, `assignment_id` |
| `epi_requests` | `catalog_item_id`, `reviewed_by_user_id` |
| `maintenance_alerts` | `acknowledged_by`, `closed_by` |
| `maintenance_events` | `completed_by`, `plan_item_id` |
| `maintenance_plan_items` | `plan_template_id` |
| `maintenance_plan_templates` | `agency_id` |
| `tools` | `default_plan_template_id`, `assigned_collaborator_id` |
| `hr_generated_documents` | `agency_id`, `generated_by` |
| `rh_requests` | `agency_id`, `archived_by` |
| `doc_templates` | `created_by` |
| `doc_instances` | `created_by` |
| `employment_contracts` | `created_by` |
| `salary_history` | (multiples) |
| `apporteur_managers` | `invited_by` |
| `agency_royalty_calculations` | `config_id` |

**Total : ~65 index manquants.**

### 2.2 Index recommandés — Priorité haute

```sql
-- P1: Tables volumineuses avec FK sans index
CREATE INDEX CONCURRENTLY idx_tickets_created_by ON apogee_tickets(created_by_user_id);
CREATE INDEX CONCURRENTLY idx_ticket_comments_created_by ON apogee_ticket_comments(created_by_user_id);
CREATE INDEX CONCURRENTLY idx_faq_items_category ON faq_items(category_id);
CREATE INDEX CONCURRENTLY idx_ticket_attachments_ticket ON apogee_ticket_attachments(ticket_id);

-- P2: Tables à croissance rapide
CREATE INDEX CONCURRENTLY idx_unified_notif_agency ON unified_notifications(agency_id);
CREATE INDEX CONCURRENTLY idx_media_links_agency ON media_links(agency_id);

-- P3: Performance requêtes courantes
CREATE INDEX CONCURRENTLY idx_user_conn_logs_user_date ON user_connection_logs(user_id, connected_at DESC);
CREATE INDEX CONCURRENTLY idx_metrics_apporteur_daily_date ON metrics_apporteur_daily(agency_id, date DESC);
CREATE INDEX CONCURRENTLY idx_prospect_pool_agency ON prospect_pool(agency_id);
```

---

## 3. NORMALISATION

### 3.1 Colonnes JSONB — 78 colonnes sur 181 tables

| Catégorie | Exemples | Verdict |
|-----------|----------|---------|
| ✅ Légitime | `metadata`, `attachments`, `embedding`, `formula` | Flexible et adapté |
| ⚠️ Questionable | `initiator_profile` (apogee_tickets) | Dénormalisation — devrait être un FK |
| ⚠️ Questionable | `enabled_modules` (profiles) | Doublon avec `user_modules` table |
| 🔴 Problématique | `permissions` (franchiseur_roles) | Devrait être une table `role_permissions` |
| 🔴 Problématique | `target_role_agences`, `target_global_roles` (priority_announcements) | Devrait être une table de jonction |

### 3.2 `initiator_profile` dans `apogee_tickets` — Dénormalisation

```sql
-- Colonne initiator_profile stocke un snapshot JSONB du profil créateur
-- PROBLÈME: données dupliquées, désynchronisées si le profil change
-- SOLUTION: Utiliser une FK vers profiles + JOIN au moment de l'affichage
```

### 3.3 `enabled_modules` dans `profiles` — Duplication

La table `profiles` contient `enabled_modules` (JSONB) **et** la table `user_modules` existe pour le même usage. Double source de vérité.

### 3.4 Colonnes texte stockant des dates

| Table | Colonne | Type actuel | Devrait être |
|-------|---------|-------------|-------------|
| `agency_commercial_profile` | `date_creation` | `text` | `date` |
| `prospect_pool` | `date_creation_etablissement` | `text` | `date` |
| `prospect_pool` | `date_cloture_exercice` | `text` | `date` |

---

## 4. TABLES MAL STRUCTURÉES

### 4.1 `apogee_tickets` — 35+ colonnes (God Table)

La table `apogee_tickets` est la plus large du schéma avec 35+ colonnes dont beaucoup nullable. Colonnes candidates à l'extraction :

| Colonnes | Table cible |
|----------|-------------|
| `roadmap_enabled`, `roadmap_month`, `roadmap_year` | `ticket_roadmap_entries` |
| `source_row_index`, `source_sheet`, `external_key` | `ticket_import_metadata` |
| `h_min`, `h_max`, `hca_code` | `ticket_estimations` |
| `original_title`, `original_description` | `ticket_original_content` |
| `merged_into_ticket_id` | OK (FK) |
| `initiator_profile` | Supprimer — utiliser FK |

**Impact** : Chaque `SELECT *` récupère 35+ colonnes. Sur 740 rows × 35 cols = payload surdimensionné.

### 4.2 `profiles` — Trop de responsabilités

La table `profiles` est un "God Table" accumulant :
- Infos personnelles (nom, email, phone)
- Configuration (enabled_modules, onboarding_payload)
- Métadonnées (agence, role_agence, global_role)
- État (is_active, connected_at)
- Apogée (apogee_user_id)

### 4.3 `collaborators` — Duplication avec `profiles`

Les tables `collaborators` et `profiles` partagent : `first_name`, `last_name`, `email`, `phone`, `apogee_user_id`. Un trigger `sync_profile_on_collaborator_update` maintient la synchronisation, mais c'est fragile et source de désynchronisation.

### 4.4 Tables dupliquées / redondantes

| Table A | Table B | Duplication |
|---------|---------|-------------|
| `sensitive_data_access_log` | `sensitive_data_access_logs` | **Même nom au singulier/pluriel !** |
| `rh_audit_log` | `activity_log` | Même structure, modules différents |
| `salary_access_audit` | `sensitive_data_access_logs` | Même objectif d'audit |
| `collaborator_document_folders` (si existe) | `media_folders` | Sync via trigger |

### 4.5 Tables probablement inutilisées

| Table | Rows | Taille | Raison |
|-------|------|--------|--------|
| `duration_calibration` | -1 | ~40 KB | Aucune donnée, jamais référencée |
| `flow_blocks` | -1 | ~40 KB | Schema JSONB vide |
| `flow_submissions` | -1 | ~40 KB | Aucune soumission |
| `live_support_messages_archive` | -1 | ~40 KB | Archive vide |
| `live_support_sessions_archive` | -1 | ~40 KB | Archive vide |
| `sav_dossier_overrides` | -1 | ~80 KB | Aucune override |

---

## 5. ISOLATION MULTI-TENANT

### 5.1 Tables sans `agency_id` ni FK vers `apogee_agencies`

**~130 tables** n'ont pas de FK directe vers `apogee_agencies`. Parmi elles, beaucoup sont légitimes (tables de configuration globale), mais certaines posent problème :

#### 🔴 Tables avec données par agence SANS FK agency :

| Table | Problème |
|-------|----------|
| `user_connection_logs` | 21 670 rows — pas d'isolation par agence |
| `chatbot_queries` | 115 rows — pas de tenant isolation |
| `announcement_reads` | Pas de tenant filtrage |
| `blocks` | 317 rows — contenu global vs agence |
| `categories` | Scope "global" mais référencé par agence |
| `deadline_alert_acknowledgements` | A `agency_id` mais pas de FK ! |
| `push_subscriptions` | Pas d'isolation |

### 5.2 RLS et multi-tenant

La majorité des policies RLS vérifient `agency_id = get_user_agency_id(auth.uid())`, ce qui est correct. Cependant :

- **`pending_registrations`** : INSERT policy `WITH CHECK (true)` — n'importe quel anonyme peut insérer (intentionnel pour le formulaire d'inscription, mais à monitorer)
- Certaines tables utilisent `has_min_global_role(auth.uid(), 5)` comme unique check, ce qui donne un accès total aux admins sans filtre agence

---

## 6. MIGRATIONS — FRAGMENTATION EXCESSIVE

### 6.1 Statistiques

| Métrique | Valeur |
|----------|--------|
| **Total migrations** | 397 |
| **Période** | Nov 2025 → Mars 2026 (~4 mois) |
| **Moyenne** | ~3.3 migrations/jour |
| **Pic** | 29 Nov 2025 : 18 migrations en 1 jour |

### 6.2 Problèmes

1. **Trop granulaire** : Des migrations atomiques de 1-2 lignes (ex: `ALTER TABLE ADD COLUMN`) au lieu de regrouper par feature
2. **Pas de squash** : 397 fichiers appliqués séquentiellement → startup lent en dev
3. **Nommage UUID** : Les fichiers utilisent des UUID au lieu de descriptions (`20251129_add_epi_tables.sql`)
4. **Pas de rollback** : Aucun mécanisme DOWN dans les migrations

### 6.3 Recommandation

```bash
# Squash des migrations en production
# Regrouper les 397 migrations en ~20-30 fichiers par domaine fonctionnel
# RH, Ticketing, Apporteurs, Media, Planning, EPI, Stats, etc.
```

---

## 7. CONTRAINTES MANQUANTES

### 7.1 CHECK constraints absentes

| Table | Colonne | Contrainte manquante |
|-------|---------|---------------------|
| `collaborators` | `type` | CHECK IN ('TECHNICIEN', 'ASSISTANTE', 'DIRIGEANT', 'COMMERCIAL', 'AUTRE') |
| `apogee_tickets` | `heat_priority` | CHECK (heat_priority >= 0 AND heat_priority <= 15) |
| `agency_subscription` | `status` | CHECK IN ('active', 'inactive', 'expired') |
| `document_requests` | `status` | CHECK IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED') |
| `epi_incidents` | `severity` | CHECK IN ('minor', 'moderate', 'severe', 'critical') |
| `support_tickets` | `heat_priority` | CHECK (heat_priority >= 0) |

**Note** : Utiliser des triggers de validation plutôt que CHECK pour les validations dynamiques.

### 7.2 NOT NULL manquants

| Table | Colonne | Devrait être NOT NULL |
|-------|---------|----------------------|
| `collaborators` | `agency_id` | ✅ Déjà NOT NULL |
| `apogee_tickets` | `kanban_status` | ✅ Déjà NOT NULL (default) |
| `profiles` | `agency_id` | ⚠️ Nullable — OK pour superadmins multi-agences |
| `activity_log` | `agency_id` | ⚠️ Nullable — OK pour actions système |

---

## 8. REQUÊTES COÛTEUSES IDENTIFIÉES

### 8.1 Patterns problématiques dans le code

| Pattern | Occurrence | Impact |
|---------|-----------|--------|
| `.select('*')` | 849 occurrences | Payload surdimensionné sur toutes les tables |
| `.from('collaborators').select('*')` | ~10 hooks | 30+ colonnes fetchées pour afficher nom |
| `.from('apogee_tickets').select('*')` | ~5 hooks | 35+ colonnes fetchées pour listes |
| `.order('created_at', { ascending: false })` sans `.limit()` | ~15 hooks | Full table scan potentiel |
| Pas de `.range()` | ~95% des hooks | Limite 1000 rows silencieuse |

### 8.2 Requêtes N+1 côté DB

```sql
-- Pattern détecté dans les triggers :
-- track_entity_changes() fait un INSERT dans activity_log 
-- pour CHAQUE UPDATE/INSERT/DELETE sur 8+ tables
-- → Un bulk UPDATE de 50 collaborateurs = 50 INSERTs dans activity_log
```

### 8.3 Fonctions RPC coûteuses

| Fonction | Coût estimé | Raison |
|----------|-------------|--------|
| `get_user_effective_modules` | 🟠 Modéré | CTE récursif + 3 JOINs + UNION ALL |
| `get_schema_ddl` | 🔴 Élevé | 11 sous-requêtes sur `information_schema` |
| `notify_on_document_request_change` | 🟠 Modéré | Boucle FOR sur tous les profils RH de l'agence |
| `sync_collaborator_folder_to_media` | 🟠 Modéré | 5 SELECT + 2 INSERT dans un trigger |

---

## 9. OPTIMISATIONS SQL RECOMMANDÉES

### P1 — Critique (à faire immédiatement)

| # | Optimisation | Impact | Effort |
|---|-------------|--------|--------|
| 1 | **Créer les 10 index FK prioritaires** (tickets, comments, faq) | -50% temps JOINs | 15min |
| 2 | **Supprimer la table dupliquée** `sensitive_data_access_log` vs `sensitive_data_access_logs` | Clarté | 30min |
| 3 | **Squash migrations** (397 → ~30) | Dev experience | 2h |
| 4 | **Supprimer `enabled_modules`** de `profiles` (doublon de `user_modules`) | Single source of truth | 1h |

### P2 — Élevé

| # | Optimisation | Impact | Effort |
|---|-------------|--------|--------|
| 5 | **Convertir colonnes `text` dates** en type `date` | Requêtes date correctes | 30min |
| 6 | **Extraire colonnes roadmap** de `apogee_tickets` en table dédiée | -30% payload tickets | 1h |
| 7 | **Index composite** `metrics_apporteur_daily(agency_id, date)` | Requêtes stats | 5min |
| 8 | **Index composite** `user_connection_logs(user_id, connected_at)` | Logs perf | 5min |
| 9 | **Ajouter CHECK constraints** via triggers de validation | Intégrité données | 1h |

### P3 — Modéré

| # | Optimisation | Impact | Effort |
|---|-------------|--------|--------|
| 10 | **Fusionner `rh_audit_log`** dans `activity_log` | -1 table, 1 système d'audit | 2h |
| 11 | **Supprimer `initiator_profile`** JSONB de tickets | -duplication données | 30min |
| 12 | **Archivage `user_connection_logs`** (>90 jours → table archive) | -80% taille | 1h |
| 13 | **Nettoyer tables vides** (flow_blocks, flow_submissions, live_support_*) | Clarté schema | 30min |
| 14 | **Partitionner `metrics_apporteur_daily`** par mois | Perf requêtes | 2h |
| 15 | **Partial index** `apogee_tickets WHERE merged_into_ticket_id IS NULL` | Perf queries actifs | 5min |

---

## 10. RLS — ANALYSE DÉTAILLÉE

### 10.1 Couverture

| Statut | Nombre |
|--------|--------|
| Tables avec RLS activé | **181/181** ✅ |
| Tables avec au moins 1 policy | ~170 |
| Tables sans policy (RLS activé mais vide) | ~11 ⚠️ |

### 10.2 Problèmes RLS

| Table | Policy | Problème | Sévérité |
|-------|--------|----------|---------|
| `pending_registrations` | `Anyone can submit registration` | `WITH CHECK (true)` — INSERT sans restriction | 🟠 Intentionnel mais à rate-limiter |
| Tables référentiels (`apogee_modules`, `apogee_priorities`, etc.) | SELECT only | Pas de policy INSERT/UPDATE → OK si géré par admin uniquement via dashboard | ✅ OK |
| ~11 tables | RLS activé, 0 policies | **Toutes les opérations bloquées** — potentiellement cassé | 🔴 |

### 10.3 Patterns RLS communs

```
Pattern 1: Agency isolation (majorité)
  USING (agency_id = get_user_agency_id(auth.uid()))

Pattern 2: Admin bypass
  USING (has_min_global_role(auth.uid(), 5))

Pattern 3: Self-access
  USING (user_id = auth.uid())

Pattern 4: Role-based
  USING (has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
```

**Remarque** : Les fonctions `get_user_agency_id` et `has_min_global_role` sont `SECURITY DEFINER` et `STABLE` → correctement configurées pour éviter la récursion RLS.

---

## 11. SIMULATION SCALABILITÉ

### 11.1 — Situation actuelle (~3 agences actives)

| Métrique | Valeur | Statut |
|----------|--------|--------|
| Taille totale DB | ~80 MB | ✅ |
| Plus grosse table | 24 MB (blocks) | ✅ |
| Temps requête typique | <50ms | ✅ |
| Index manquants | 65+ | ⚠️ Non impactant (peu de données) |

### 11.2 — 100 agences

| Métrique | Valeur estimée | Statut |
|----------|---------------|--------|
| `user_connection_logs` | ~2M rows (200 MB) | 🟠 Nécessite archivage |
| `metrics_apporteur_daily` | ~400K rows (80 MB) | 🟠 Nécessite partitionnement |
| `apogee_tickets` | ~74K rows (120 MB) | ⚠️ Index FK critiques |
| JOINs sans index FK | Timeout possible | 🔴 |
| `get_user_effective_modules` | >100ms/appel | 🟠 |

### 11.3 — 1000 agences

| Risque | Impact | Solution |
|--------|--------|----------|
| `user_connection_logs` | 20M+ rows | Partitionnement par mois + archivage |
| `activity_log` triggers | INSERT storm sur bulk ops | Batch async via queue |
| RLS functions | Appelées par row → lenteur | Matérialiser les rôles dans une vue |
| `blocks` table | 24 MB × ratio contenu | Externaliser HTML vers Storage |

---

## 12. RÉSUMÉ EXÉCUTIF

```
┌────────────────────────────────────────────────────────┐
│           DATABASE SCORE : 6.8 / 10                     │
│                                                        │
│  🔴 PROBLÈMES CRITIQUES :                              │
│     - 65+ FK sans index → JOINs lents à l'échelle     │
│     - Tables dupliquées (sensitive_data_access_log/s)  │
│     - 397 migrations fragmentées                       │
│     - ~11 tables avec RLS activé mais 0 policies       │
│     - `apogee_tickets` God Table (35+ colonnes)        │
│                                                        │
│  🟠 PROBLÈMES MODÉRÉS :                                │
│     - JSONB `initiator_profile` = snapshot dénormalisé │
│     - Double source `enabled_modules` (profiles + table)│
│     - Colonnes text stockant des dates                 │
│     - Pas de partitionnement tables métriques          │
│     - Sync trigger profiles↔collaborators fragile      │
│                                                        │
│  ✅ POINTS FORTS :                                     │
│     - RLS activé sur 181/181 tables                    │
│     - Functions SECURITY DEFINER bien configurées      │
│     - Isolation multi-tenant via agency_id + RLS       │
│     - activity_log audit trail automatique             │
│     - Triggers de sync profiles/collaborators          │
│     - FK CASCADE on delete pour nettoyage propre       │
│                                                        │
│  📈 GAINS P1 (5h → score cible 8.0/10) :              │
│     - Créer 10 index FK prioritaires (15min)           │
│     - Squash migrations (2h)                           │
│     - Supprimer tables dupliquées (30min)              │
│     - Convertir text→date (30min)                      │
│     - Supprimer enabled_modules de profiles (1h)       │
└────────────────────────────────────────────────────────┘
```

---

## 13. PLAN D'ACTION

### Sprint 1 — Quick Wins (1 jour)
- Créer les 10 index FK critiques
- Supprimer `sensitive_data_access_log` (garder `sensitive_data_access_logs`)
- Convertir 3 colonnes text→date
- Index composite sur `metrics_apporteur_daily`

### Sprint 2 — Normalisation (2 jours)
- Supprimer `enabled_modules` de profiles
- Extraire colonnes roadmap de `apogee_tickets`
- Supprimer `initiator_profile` JSONB
- Fusionner `rh_audit_log` dans `activity_log`

### Sprint 3 — Migrations & Maintenance (1 jour)
- Squash 397 migrations en ~30 fichiers
- Archivage `user_connection_logs` >90 jours
- Nettoyer tables vides (flow_*, live_support_*)
- Auditer les 11 tables sans RLS policies

### Sprint 4 — Scalabilité (2 jours)
- Partitionner `metrics_apporteur_daily` par mois
- Partial index tickets actifs
- Optimiser `get_user_effective_modules` (cache matérialisé)
- Rate limiter `pending_registrations` INSERT

---

*Audit Base de Données HelpConfort — V0.9.1 — 7 Mars 2026*  
*Prochaine révision : Après Sprint 1 + 2*
