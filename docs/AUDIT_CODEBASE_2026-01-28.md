# 🔍 AUDIT COMPLET CODEBASE - 28 Janvier 2026

**Version analysée** : v0.8.5+
**Objectif** : Identifier le legacy, le simplifiable et l'inutile

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Éléments identifiés | Impact |
|-----------|---------------------|--------|
| 🔴 **À SUPPRIMER** | 15+ fichiers/dossiers | Réduction code mort |
| 🟠 **À SIMPLIFIER** | 8+ modules | Maintenance réduite |
| 🟡 **À CONSOLIDER** | 5+ systèmes dupliqués | Architecture propre |
| 🟢 **OK (à garder)** | Système core V2 | Stable |

---

## 🔴 1. LEGACY À SUPPRIMER IMMÉDIATEMENT

### 1.1 Hook `use-user-creation-requests.ts` - DEPRECATED
**Fichier** : `src/hooks/use-user-creation-requests.ts`
**Raison** : Marqué `@deprecated` - système V1 de demandes de création utilisateur
**Impact** : 264 lignes de code mort
**Action** : **SUPPRIMER** le fichier + vérifier la table `user_creation_requests` (données historiques uniquement)

### 1.2 Hook `use-support-notifications.ts` - Table LEGACY
**Fichier** : `src/hooks/use-support-notifications.ts`
**Raison** : Utilise `support_tickets` et `support_messages` (tables legacy V2)
**Contexte** : Le système V3 utilise `apogee_tickets` pour tout le support
**Impact** : Ce hook écoute des tables qui ne sont plus utilisées
**Action** : **SUPPRIMER** ou **REDIRIGER** vers apogee_tickets

### 1.3 Fichier `support-auto.ts` - Pipeline IA legacy
**Fichier** : `src/lib/support-auto.ts` (516 lignes)
**Raison** : Référence `support_tickets` (système V2)
**Action** : **SUPPRIMER** après validation que toute la logique est migrée vers apogee_tickets

### 1.4 Composants `src/components/tickets/` - Legacy UI
**Dossier** : `src/components/tickets/`
**Contenu** : `ServiceBadge.tsx`, `TicketCategoryBadge.tsx`, `TicketSourceBadge.tsx`
**Raison** : Référencent l'ancien système support_tickets
**Action** : **VÉRIFIER** les imports puis **SUPPRIMER** si plus utilisés

### 1.5 Page `RHTechPage.tsx` - Placeholder vide
**Fichier** : `src/pages/RHTechPage.tsx`
**Raison** : 2 des 3 cartes sont "Bientôt disponible" depuis des mois
**Contenu utile** : Uniquement le lien vers Planning Hebdo (déjà accessible ailleurs)
**Action** : **SUPPRIMER** la page, rediriger vers `/rh/suivi/plannings`

### 1.6 Fichiers JSON data legacy
**Dossiers** :
- `src/data/apogee-data.json` - Utilisé par EditorContext (seed data)
- `src/data/backup-apogee-data-2.json` - Backup ancien
- `src/data/apogee-usage-report.json` - Rapport usage unique
**Action** : 
  - `apogee-data.json` : **GARDER** (seed initial)
  - `backup-apogee-data-2.json` : **SUPPRIMER** (backup obsolète)
  - `apogee-usage-report.json` : **SUPPRIMER** si le rapport n'est plus utilisé

### 1.7 Dossier `src/components/admin/access-rights/tabs/`
**Contenu** : `AuditHistoryTab.tsx`, `SubscriptionsTab.tsx`, `UsersAccessTab.tsx`
**Contexte** : `AccessRightsConsole.tsx` redirige vers `/admin/gestion` (UnifiedManagementPage)
**Action** : **VÉRIFIER** si ces tabs sont importés ailleurs, sinon **SUPPRIMER** tout le dossier

---

## 🟠 2. À SIMPLIFIER / CONSOLIDER

### 2.1 Triple système de Guide (Apogée, Apporteur, OPERIA)
**Contextes** :
- `EditorContext.tsx` → table `blocks` (Guide Apogée)
- `ApporteurEditorContext.tsx` → table `apporteur_blocks`
- `OperiaEditorContext.tsx` → table `operia_blocks`

**Problème** : 3 contextes quasi-identiques, 3 tables identiques, 3x le code
**Recommandation** : 
  - Créer un **GenericBlocksContext** paramétrable par table
  - OU fusionner les 3 tables avec une colonne `guide_type`

### 2.2 Pages Category dupliquées
**Fichiers** :
- `CategoryActionsAMener.tsx` (408 lignes)
- `CategoryApporteur.tsx`
- `CategoryHelpConfort.tsx`
- `CategoryOperia.tsx`
- `CategoryPage.tsx`

**Problème** : Code très similaire entre ces pages
**Action** : Créer un composant `GenericCategoryPage` avec le type en prop

### 2.3 Hooks `use-category-*.ts` dupliqués
**Fichiers** :
- `use-category.ts`
- `use-category-helpconfort.ts`
- `use-category-logic.ts`

**Action** : Fusionner en un seul hook paramétrable

### 2.4 Route legacy `/hc-agency/` vs `/pilotage/`
**Situation** : Les deux routes coexistent
**Fichiers** : `src/pages/hc-agency/` (2 pages seulement)
**Action** : Migrer `MesApporteursPage` et `RdvMapPage` vers `/pilotage/` et supprimer le dossier

---

## 🟡 3. TABLES DB POTENTIELLEMENT LEGACY

### 3.1 Tables `support_*` (système V2)
**Tables concernées** :
- `support_tickets`
- `support_messages`
- `support_ticket_actions`
- `support_attachments`

**Situation** : Le système V3 utilise `apogee_tickets` + `apogee_ticket_support_exchanges`
**Action** : 
  1. Vérifier qu'il n'y a plus de code actif qui les utilise
  2. Créer une migration pour archiver/supprimer ces tables

### 3.2 Table `user_creation_requests`
**Situation** : Système de workflow V1 deprecated
**Action** : Archiver après export historique

### 3.3 Tables `leave_requests` / `expense_requests`
**Référencées dans** : `docsData.ts`, types Supabase
**Situation** : Module N1 supprimé, mais tables référencées
**Action** : Vérifier si encore utilisées par le module Franchiseur

---

## 🟢 4. ÉLÉMENTS CORE À CONSERVER

### 4.1 Système de permissions V2 ✅
- `src/permissions/` - Moteur permissions
- `src/config/roleMatrix.ts` - Matrice rôles
- `src/types/globalRoles.ts` - Types rôles
- `src/hooks/useHasGlobalRole.ts`

### 4.2 Module RH Cockpit ✅
- `src/components/rh/cockpit/` - Interface moderne
- `src/components/rh/browser-tabs/` - Navigation onglets
- `src/pages/rh/RHSuiviIndex.tsx` - Page principale

### 4.3 StatIA Engine ✅
- `src/statia/` - Moteur de métriques centralisé
- Structure propre avec definitions, engine, hooks

### 4.4 Module Franchiseur ✅
- `src/franchiseur/` - Module réseau bien structuré

### 4.5 Apogee Tickets (Gestion Projet) ✅
- `src/apogee-tickets/` - Module actif et maintenu

---

## 📋 5. FICHIERS/DOSSIERS ORPHELINS SUSPECTS

### 5.1 `src/modules/interventions_rt/`
**Contenu** : Module "relevé technique" isolé
**Action** : Vérifier s'il est utilisé, sinon supprimer

### 5.2 `src/commercial/`
**Pages** : `CommercialPage.tsx` et sous-dossiers
**Action** : Vérifier l'utilisation, potentiellement legacy

### 5.3 `src/components/flow-builder/`
**Contenu** : 8 fichiers pour un "Flow Builder"
**Lié à** : `/admin/flow` route
**Action** : Vérifier si fonctionnel et utilisé

### 5.4 Extensions TipTap custom
**Dossier** : `src/extensions/`
**Contenu** : `Callout.tsx`, `FileButton.tsx`, `FontSize.tsx`, etc.
**Action** : **GARDER** si utilisé par RichTextEditor

---

## 🎯 6. PLAN D'ACTION RECOMMANDÉ

### Phase 1 - Quick Wins (< 1 jour)
1. ❌ Supprimer `use-user-creation-requests.ts`
2. ❌ Supprimer `backup-apogee-data-2.json`
3. ❌ Supprimer `RHTechPage.tsx` + redirection

### Phase 2 - Nettoyage Support Legacy (1-2 jours)
4. ❌ Supprimer `use-support-notifications.ts`
5. ❌ Supprimer `support-auto.ts`
6. ❌ Supprimer `src/components/tickets/`
7. ⚠️ Vérifier/supprimer tabs access-rights legacy

### Phase 3 - Consolidation Guides (2-3 jours)
8. 🔄 Refactorer les 3 EditorContexts en 1 générique
9. 🔄 Fusionner les pages Category*

### Phase 4 - Migration Routes (1 jour)
10. 🔄 Migrer `/hc-agency/` vers `/pilotage/`
11. 🔄 Supprimer le dossier `/hc-agency/`

### Phase 5 - Nettoyage DB (migration)
12. 🗄️ Archiver tables `support_*`
13. 🗄️ Archiver table `user_creation_requests`

---

## 📊 IMPACT ESTIMÉ

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Fichiers TypeScript | ~450 | ~420 | -30 fichiers |
| Lignes de code | ~80,000 | ~75,000 | -5,000 lignes |
| Tables DB actives | 85+ | 80 | -5 tables |
| Contextes React | 6 | 4 | -2 contextes |
| Complexité maintenance | Élevée | Moyenne | ⬇️ |

---

**Généré le** : 2026-01-28
**Par** : Audit automatique Lovable AI
