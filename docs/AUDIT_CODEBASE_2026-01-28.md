# 🔍 AUDIT COMPLET CODEBASE — Mise à jour 7 Mars 2026

**Version analysée** : V0.9.1 — Permissions Unifiées  
**Audit initial** : 28 Janvier 2026  
**Dernière MAJ** : 7 Mars 2026

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Identifiés | Résolus (V0.9.1) | Restants |
|-----------|-----------|-------------------|----------|
| 🔴 **À SUPPRIMER** | 15+ fichiers | ✅ 8 résolus | ~7 restants |
| 🟠 **À SIMPLIFIER** | 8+ modules | ⏳ Non traité | 8 restants |
| 🟡 **À CONSOLIDER** | 5+ systèmes | ✅ 1 résolu (permissions) | ~4 restants |
| 🟢 **OK (à garder)** | Système core | ✅ Renforcé | Stable |

---

## ✅ RÉSOLU DEPUIS L'AUDIT INITIAL

### Permissions Unifiées (V0.9.1)
- ✅ `profiles.enabled_modules` JSONB → **purgé** de tout le code actif
- ✅ 6 fonctions SQL migrées vers `user_modules`
- ✅ ~20 policies RLS migrées
- ✅ Edge Function `sensitive-data` migrée vers `user_modules`
- ✅ Edge Function `create-user` migrée
- ✅ Section 🚧 "En cours de développement" dans écran Droits

### Médiathèque (V0.8.7)
- ✅ Tables legacy `collaborator_documents`, `folders`, `access_logs` supprimées
- ✅ 19 composants legacy documents RH supprimés
- ✅ 5 hooks legacy documents supprimés
- ✅ `RHDocumentManager` → `MediaLibraryPortal`

---

## 🔴 1. LEGACY RESTANT À SUPPRIMER

### 1.1 ~~Hook `use-user-creation-requests.ts`~~ — À VÉRIFIER
**Fichier** : `src/hooks/use-user-creation-requests.ts`  
**Statut** : Marqué `@deprecated` — **vérifier si déjà supprimé**  
**Action** : Confirmer suppression + table `user_creation_requests`

### 1.2 Hook `use-support-notifications.ts` — Table LEGACY
**Fichier** : `src/hooks/use-support-notifications.ts`  
**Raison** : Écoute `support_tickets` / `support_messages` (tables V2 legacy)  
**Contexte** : Le système V3 utilise `apogee_tickets`  
**Action** : **SUPPRIMER** ou **REDIRIGER** vers `apogee_tickets`

### 1.3 Fichier `support-auto.ts` — Pipeline IA legacy
**Fichier** : `src/lib/support-auto.ts`  
**Raison** : Référence `support_tickets` (système V2)  
**Action** : **SUPPRIMER** après validation migration complète

### 1.4 Composants `src/components/tickets/` — Legacy UI
**Dossier** : `src/components/tickets/`  
**Contenu** : `ServiceBadge.tsx`, `TicketCategoryBadge.tsx`, `TicketSourceBadge.tsx`  
**Action** : **VÉRIFIER** les imports puis **SUPPRIMER** si plus utilisés

### 1.5 Fichier JSON backup legacy
**Fichier** : `src/data/backup-apogee-data-2.json`  
**Action** : **SUPPRIMER** (backup obsolète)

### 1.6 Dossier `src/components/admin/access-rights/tabs/`
**Contenu** : `AuditHistoryTab.tsx`, `SubscriptionsTab.tsx`, `UsersAccessTab.tsx`  
**Contexte** : `AccessRightsConsole.tsx` redirige vers `/admin/gestion` (UnifiedManagementPage)  
**Action** : **VÉRIFIER** si importés, sinon **SUPPRIMER** tout le dossier

---

## 🟠 2. À SIMPLIFIER / CONSOLIDER

### 2.1 Triple système de Guide (Apogée, Apporteur, OPERIA)
**Contextes** :
- `EditorContext.tsx` → table `blocks`
- `ApporteurEditorContext.tsx` → table `apporteur_blocks`
- `OperiaEditorContext.tsx` → table `operia_blocks`

**Problème** : 3 contextes quasi-identiques  
**Recommandation** : GenericBlocksContext paramétrable par table

### 2.2 Pages Category dupliquées
**Fichiers** : `CategoryActionsAMener.tsx`, `CategoryApporteur.tsx`, `CategoryHelpConfort.tsx`, `CategoryOperia.tsx`, `CategoryPage.tsx`  
**Action** : Créer `GenericCategoryPage` avec le type en prop

### 2.3 Hooks `use-category-*.ts` dupliqués
**Fichiers** : `use-category.ts`, `use-category-helpconfort.ts`, `use-category-logic.ts`  
**Action** : Fusionner en un seul hook paramétrable

---

## 🟡 3. TABLES DB POTENTIELLEMENT LEGACY

### 3.1 Tables `support_*` (système V2)
**Tables** : `support_tickets`, `support_messages`, `support_ticket_actions`, `support_attachments`  
**Situation** : Le système V3 utilise `apogee_tickets` + `apogee_ticket_support_exchanges`  
**Action** : Archiver après vérification qu'aucun code actif ne les utilise

### 3.2 Table `user_creation_requests`
**Situation** : Workflow V1 deprecated  
**Action** : Archiver après export historique

### 3.3 Table `profiles.enabled_modules` (colonne JSONB)
**Situation** : ✅ Plus aucun code actif ne la lit. Peut être droppée en migration.  
**Action** : Migration SQL `ALTER TABLE profiles DROP COLUMN enabled_modules`

---

## 🟢 4. ÉLÉMENTS CORE À CONSERVER

### 4.1 Système de permissions V3 ✅ (RENFORCÉ)
- `src/permissions/` — Moteur permissions (barrel export)
- `src/types/modules.ts` — MODULE_DEFINITIONS (source unique)
- `src/hooks/access-rights/` — useEffectiveModules, useModuleRegistry, useModuleOverrides
- Tables : `module_registry`, `user_modules`, `plan_tiers`, `plan_tier_modules`
- RPC : `get_user_effective_modules`
- SQL : `has_module_v2()`, `has_module_option_v2()`

### 4.2 Module RH Cockpit ✅
- `src/components/rh/cockpit/` — Interface moderne
- Données sensibles chiffrées AES-256-GCM via Edge Function `sensitive-data`

### 4.3 StatIA Engine ✅
- `src/statia/` — Moteur de métriques centralisé
- `STATIA_RULES` dans `domain/rules.ts`

### 4.4 Module Franchiseur ✅
- `src/franchiseur/` — Module réseau

### 4.5 Apogee Tickets ✅
- `src/apogee-tickets/` — Module actif, protégé (`PROTECTED_MODULES`)

### 4.6 Module Commercial ✅ (NOUVEAU V0.9.0)
- Scoring adaptatif, comparateur, pipeline prospects
- Tables : `apporteur_scores`, `apporteur_metrics_daily`, `prospects`, `prospect_interactions`

### 4.7 Médiathèque ✅ (CONSOLIDÉE V0.8.7)
- `MediaLibraryPortal` — Composant Finder unifié
- Tables : `media_assets`, `media_links`, `media_folders`

---

## 🔒 5. AUDIT SÉCURITÉ (Mars 2026)

### 5.1 Vulnérabilités RLS identifiées

| Table | Sévérité | Problème | Statut |
|-------|----------|----------|--------|
| `knowledge_base` | 🔴 CRITIQUE | `anon` read via `USING (true)` | ⏳ À corriger |
| `blocks` | 🔴 CRITIQUE | `anon` read via `USING (true)` | ⏳ À corriger |
| `ai_search_cache` | 🔴 CRITIQUE | `ALL` pour `authenticated` | ⏳ À corriger |
| `technician_weekly_schedule` | 🟠 HAUTE | Pas de scoping agence | ⏳ À corriger |
| `doc_instances` | 🟠 HAUTE | `UPDATE` policy `WHERE id = id` | ⏳ À corriger |

### 5.2 Dépendances vulnérables

9 vulnérabilités haute sévérité (npm audit) : `fabric`, `xlsx`, `tar`, `serialize-javascript`

### 5.3 Auth
- ⚠️ "Leaked password protection" désactivé dans Supabase Auth

---

## 🎯 6. PLAN D'ACTION RESTANT

### Phase 1 — Sécurité (URGENT)
1. 🔒 Patcher 3 policies RLS critiques (`knowledge_base`, `blocks`, `ai_search_cache`)
2. 🔒 Corriger `doc_instances` UPDATE policy
3. 🔒 Activer "Leaked password protection"
4. 🔒 Mettre à jour dépendances vulnérables

### Phase 2 — Nettoyage Support Legacy
5. ❌ Supprimer `use-support-notifications.ts`
6. ❌ Supprimer `support-auto.ts`
7. ❌ Supprimer `src/components/tickets/` (si non importés)
8. ❌ Supprimer `backup-apogee-data-2.json`
9. ⚠️ Vérifier/supprimer tabs access-rights legacy

### Phase 3 — Consolidation Guides
10. 🔄 Refactorer les 3 EditorContexts en 1 générique
11. 🔄 Fusionner les pages Category*

### Phase 4 — Nettoyage DB
12. 🗄️ `ALTER TABLE profiles DROP COLUMN enabled_modules`
13. 🗄️ Archiver tables `support_*`
14. 🗄️ Archiver table `user_creation_requests`

---

## 📊 IMPACT ESTIMÉ (restant)

| Métrique | Actuel | Après nettoyage | Gain |
|----------|--------|-----------------|------|
| Fichiers à supprimer | ~7 | 0 | -7 fichiers |
| Lignes de code mort | ~2,000 | 0 | -2,000 lignes |
| Tables à archiver | ~5 | 0 | -5 tables |
| Contextes React | 5 | 3 | -2 contextes |
| Vulnérabilités RLS | 5 | 0 | 🔒 |

---

*Audit Codebase HelpConfort — MAJ 7 Mars 2026*
