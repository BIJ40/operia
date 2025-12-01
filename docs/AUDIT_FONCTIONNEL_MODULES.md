# AUDIT FONCTIONNEL – MODULE PAR MODULE

**Date**: 2025-12-01  
**Statut**: Audit pré-production  
**Objectif**: Identifier les incohérences fonctionnelles avant déploiement

---

## 🟢 4.1 ACADEMY / GUIDES

### ✅ Points forts
- **CRUD complet**: blocks, apporteur_blocks, guide_chunks tous opérationnels
- **Gestion catégories**: categories table avec display_order, scope, color_preset
- **Rôles cohérents**: 
  - Lecture: tous authenticated (N0+)
  - Écriture/Update: franchisor_admin (N4+)
  - Delete: platform_admin (N5+)
- **Upload images**: Buckets category-images, category-icons publics
- **RAG intégré**: rag-michu.ts unifié, guide_chunks indexé, 7 context_type validés

### ⚠️ Points d'attention
1. **Fragmentation UI**: CategoryPage.tsx vs CategoryHelpConfort.tsx vs CategoryActionsAMener.tsx → Trois implémentations similaires
2. **Edition mode**: help_academy.edition option existe mais protection insuffisante côté RLS (blocks UPDATE = N5+ seulement)
3. **Documents vs Guides**: Distinction floue entre documents table (base_documentaire) et blocks/apporteur_blocks

### 🎯 Recommandations
- Consolider les 3 CategoryPage en un seul composant générique avec props scope
- Ajouter RLS policy granulaire pour edition option (permettre N4+ d'éditer si option activée)
- Clarifier dans docs: documents = fichiers téléchargeables, blocks = contenu éditorial

---

## 🟡 4.2 SUPPORT + TICKETING

### ✅ Points forts
- **Création tickets**: Formulaire complet avec category, priority, service (SupportUser.tsx)
- **Statuts cohérents**: 5 statuts canoniques (new, in_progress, waiting_user, resolved, closed) définis dans supportService.ts
- **Vues filtrées**: KanbanView + TicketList avec filtrage par rôle
- **Attribution**: support_tickets.assigned_to avec RLS appropriate
- **SLA automatique**: due_at calculé par trigger, sla_status (ok/warning/late), SLABadge visuel
- **Classification IA**: support-auto-classify edge function opérationnel

### ⚠️ Points d'attention
1. **Priorités multiples**: 
   - Support tickets: 4 niveaux (bloquant, urgent, important, normal)
   - Apogée tickets: système 0→12 heat_priority séparé
   - **INCOHÉRENCE**: Deux systèmes incompatibles pour deux modules similaires
2. **Routes ambiguës**:
   - /support = Hub général (tous)
   - /support/helpcenter = Interface chat/FAQ/tickets (tous)
   - /support/mes-demandes = Gestion tickets complets (tous)
   - /support/console = Console SU (N5+ strict via SupportConsoleGuard)
   - **CONFUSION**: 3 routes utilisateur différentes (/support, /helpcenter, /mes-demandes) pour accès tickets
3. **Vues divergentes**: AdminSupportTickets.tsx (console) vs UserTickets.tsx (utilisateur) → Code dupliqué pour affichage tickets
4. **Statuts legacy**: Certains tickets anciens ont encore status='open' au lieu de 'new' (migration incomplète)

### 🎯 Recommandations CRITIQUES
- **Unifier les priorités**: Harmoniser support (bloquant/urgent/important/normal) et apogée (0-12) → Proposition: mapper heat_priority vers 4 niveaux canoniques
- **Simplifier routes support**: Merger /support/helpcenter et /support/mes-demandes en une seule interface
- **Migrer statuts legacy**: UPDATE support_tickets SET status='new' WHERE status='open'
- **Extraire composants communs**: TicketListItem, TicketCard réutilisables entre admin et user

---

## 🔴 4.3 APOGÉE-TICKETS (Gestion de Projet)

### ✅ Points forts
- **Module bien isolé**: src/apogee-tickets/ avec architecture propre (hooks, components, pages, types)
- **Routes cohérentes**: Toutes sous /projects/* (kanban, list, import, incomplete, classify, review, permissions)
- **Permissions granulaires**: 3 options (kanban=créer+voir, manage=éditer, import=bulk) bien implémentées
- **Export multiformat**: CSV, Excel, PDF avec filtres respectés
- **Workflow transitions**: apogee_ticket_transitions + can_transition_ticket() avec rôles (developer/tester/franchiseur)
- **Notifications visuelles**: Blinking borders via apogee_ticket_views, last_modified_at tracking

### 🔴 Incohérences CRITIQUES
1. **Noms incohérents**:
   - Table DB: `apogee_tickets` 
   - Module key: `apogee_tickets`
   - Dossier code: `src/apogee-tickets/`
   - Routes: `/projects/*`
   - Label UI: "Gestion de Projet" vs "Ticketing Apogée" vs "Suivi Dev"
   - **ACTION**: Décider terminologie unique et l'appliquer partout
   
2. **Statuts fragmentés**:
   - `kanban_status` (text FK vers apogee_ticket_statuses): BACKLOG, EN_COURS, EN_TEST, etc.
   - `qualif_status` (text): a_qualifier, qualifie, invalide
   - `apogee_status_raw`, `hc_status_raw` (text): anciennes colonnes Excel non utilisées
   - **CONFUSION**: Quel statut fait foi ? kanban_status utilisé partout, mais qualif_status parallèle
   
3. **Permissions édition incohérentes**:
   - `manage` option: censé contrôler édition champs
   - Developer role override: peut éditer h_min/h_max/owner_side même sans manage
   - Transitions statut: contrôlées par apogee_ticket_user_roles (indépendant de manage)
   - **INCOHÉRENCE**: 3 systèmes de permissions qui se chevauchent

4. **Export incomplet**:
   - Kanban: Export CSV/Excel/PDF avec 31 champs ✅
   - List: Export absent ❌
   - Filtres: Non préservés entre vues Kanban↔List ❌

### 🎯 Recommandations URGENTES
- **Renommer uniformément**: "Gestion de Projet" partout (DB reste apogee_tickets pour legacy, mais UI unifiée)
- **Supprimer colonnes zombie**: apogee_status_raw, hc_status_raw (non utilisées, confuses)
- **Unifier statuts**: kanban_status = source de vérité unique, supprimer qualif_status ou le rendre computed
- **Clarifier permissions**: Documentation explicite des 3 layers (module options, developer override, transition roles)
- **Ajouter export List**: Même fonctionnalité que Kanban
- **Synchroniser filtres**: useProjectFilters global shared entre Kanban et List

---

## 🟡 4.4 PLANNING / PILOTAGE

### ✅ Points forts
- **Filtres cohérents**: PeriodSelector unique (J, 7J, M, A, 12M) appliqué globalement
- **KPIs consolidés**: CA, factures, devis, interventions, projets, techniciens
- **Univers/Apporteurs**: Matrices bidimensionnelles bien implémentées
- **Droits agence**: Isolation via profiles.agence strictement respectée (apogee-api base URL dynamique)
- **Tuiles unifiées**: Gradient helpconfort-blue, border-l-4, hover effects cohérents

### ⚠️ Points d'attention
1. **Sélecteur période**: 
   - Position variable (parfois en haut, parfois intégré dans page)
   - État local vs global (certains utilisent contexte, d'autres useState)
2. **Calculs frontend lourd**: 
   - Agrégations univers/apporteurs en JS (pas de backend cache)
   - Performance dégradée sur grandes agences (>1000 projets)
3. **Filtres secondaires**: 
   - Univers filter, Apporteur filter indépendants du PeriodSelector
   - État non synchronisé entre pages Indicateurs* (5 pages différentes)
4. **Affichage tuiles**:
   - GRADIENT_VARIANTS génère directions aléatoires basées sur hash(title)
   - **RISQUE**: Re-render change la direction (instabilité visuelle)

### 🎯 Recommandations
- **Centraliser PeriodSelector**: Un seul composant avec position fixe (header ou sous-header)
- **Backend caching**: Implémenter calculs côté edge function pour /hc-agency/indicateurs (mais attention: APOGEE API rejette backend calls → workaround nécessaire)
- **Unifier filtres**: FiltersContext global pour synchroniser entre indicateurs/univers/apporteurs/techniciens/SAV
- **Stabiliser gradients**: useStableGradient hook avec useMemo pour éviter re-calculs

---

## 🟢 4.5 COLLABORATEURS

### ✅ Points forts
- **Profils complets**: agency_collaborators table avec FK vers profiles.agency_id
- **Édition fonctionnelle**: Formulaire AgencyCollaboratorDialog avec validation Zod
- **Rôles cohérents**: role_agence (Dirigeant, Assistante, Commercial, Tête de réseau, Externe) bien définis
- **Agence cohérente**: Toujours FK vers apogee_agencies.id, pas de texte libre
- **Affichage direct**: AdminCollaborators.tsx liste tous les collaborateurs avec agence
- **Formulaires DB-aligned**: Tous les champs mappent 1:1 avec la table

### ⚠️ Points d'attention mineurs
1. **is_registered_user flag**: Permet de lier collaborateur→user_id mais lien manuel (pas automatique si user créé plus tard)
2. **Duplication données**: Si un user est aussi collaborateur, first_name/last_name dupliqué (profiles + agency_collaborators)
3. **Notes limitées**: Champ notes en text libre, pas de structure/tags pour catégoriser
4. **Permissions**: N2 peut créer collaborateurs dans son agence, mais ne peut pas les "promouvoir" en users authentifiés (nécessite N3+)

### 🎯 Recommandations
- **Auto-sync**: Trigger pour synchroniser profiles↔agency_collaborators si user_id lié
- **Notes structurées**: Ajouter metadata JSONB pour tags/catégories
- **Promotion workflow**: Bouton "Créer compte utilisateur" pour collaborateur → génère invitation email

---

## 🔴 4.6 APOGÉE – Dossiers / Interventions / Devis / Factures

### ❌ MODULE NON IMPLÉMENTÉ

**Statut actuel**: Ce module n'existe PAS encore dans l'application.

**Ce qui existe**:
- API Apogée intégrée via src/apogee-connect/ pour KPIs agence
- Edge function get-kpis retourne CA global, mais pas détail projets
- Pas de table `apogee_projets`, `apogee_interventions`, `apogee_devis`, `apogee_factures`

**Ce qui manque**:
- ❌ Synchronisation ID projet unique
- ❌ Matching RT (relevé technicien) → Devis
- ❌ Matching Devis → Facture
- ❌ Drill-down univers métier par projet
- ❌ Drill-down apporteurs par projet
- ❌ Filtres projets/interventions/devis/factures

### 🎯 Recommandations pour FUTURE implémentation
**Si ce module doit être ajouté**, créer:
1. **Tables**: apogee_projets (id, external_ref, univers_id, apporteur_id, status), apogee_interventions (id, projet_id, tech_id, date), apogee_devis (id, projet_id, amount, validated_at), apogee_factures (id, devis_id, amount, paid_at)
2. **Relations**: FK strictes pour tracer RT→Devis→Facture
3. **Sync**: Edge function scheduled pour importer depuis API Apogée quotidiennement
4. **UI**: Pages /hc-agency/projets, /hc-agency/projets/:id avec vues détaillées

**DÉCISION NÉCESSAIRE**: Est-ce un module requis pour V1 production ?

---

## 📊 SYNTHÈSE PAR CRITICITÉ

### 🔴 CRITIQUES (Bloquants production)
1. **Apogée-Tickets nommage**: Incohérence terminologie (Gestion Projet vs Ticketing Apogée vs Suivi Dev)
2. **Support priorités**: Deux systèmes incompatibles (support 4 niveaux vs apogée heat 0-12)
3. **Apogée-Tickets statuts**: qualif_status vs kanban_status → Clarifier lequel est source de vérité

### 🟡 IMPORTANTS (Qualité/UX)
4. **Support routes**: 3 entrées différentes (/support, /helpcenter, /mes-demandes) pour même fonctionnalité
5. **Pilotage filtres**: État non synchronisé entre 5 pages indicateurs
6. **Category fragmentation**: 3 implémentations page similaires

### 🟢 MINEURS (Améliorations futures)
7. **Collaborateurs auto-sync**: Lier automatiquement profiles↔agency_collaborators
8. **Export projects List**: Ajouter fonctionnalité manquante
9. **Gradients instables**: Re-render change direction visuelle

---

## ⚡ PLAN D'ACTION PRÉ-PRODUCTION

### Phase Critique (8h) - AVANT DÉPLOIEMENT
1. **Décider terminologie Apogée-Tickets**: "Gestion de Projet" ou "Suivi Dev" → Appliquer partout (labels, routes, docs)
2. **Unifier priorités support/apogée**: Mapper heat_priority (0-12) → 4 niveaux support OU inverser
3. **Nettoyer statuts apogée**: 
   - Supprimer qualif_status (utiliser kanban_status + is_qualified boolean)
   - DROP COLUMN apogee_status_raw, hc_status_raw (zombies)
4. **Migrer statuts support legacy**: UPDATE support_tickets SET status='new' WHERE status='open'

### Phase UX (6h) - RECOMMANDÉ AVANT PRODUCTION
5. **Consolider routes support**: Merger /helpcenter et /mes-demandes
6. **Unifier CategoryPage**: Composant générique avec scope prop
7. **Synchroniser filtres pilotage**: FiltersContext global

### Phase Post-Prod (12h) - AMÉLIORATION CONTINUE
8. Collaborateurs auto-sync
9. Backend caching pour KPIs (avec workaround API rejection)
10. Export projects List
11. Notes structurées collaborateurs

---

## 🏁 VERDICT PRÉ-PRODUCTION

**Status global**: 🟡 **ATTENTION REQUISE**

- **Academy / Guides**: 🟢 Prêt (fragmentation UI tolérable)
- **Support + Ticketing**: 🟡 Fonctionnel mais priorités/routes incohérentes
- **Apogée-Tickets**: 🔴 Terminologie et statuts à clarifier AVANT prod
- **Pilotage**: 🟢 Prêt (filtres non-sync tolérable, performance OK pour MVP)
- **Collaborateurs**: 🟢 Prêt
- **Apogée Dossiers/Devis/Factures**: ⚫ Non implémenté (décision scope requise)

**Estimation**: 8h critiques + 6h recommandées = **14h avant production safe**

---

## 📋 QUESTIONS STRATÉGIQUES À TRANCHER

1. **Apogée-Tickets**: Garder nom actuel ou renommer uniformément "Gestion de Projet" ?
2. **Priorités**: Unifier support + apogée sur même échelle 4 niveaux ?
3. **Routes support**: Garder 3 entrées ou consolider ?
4. **Module Dossiers/Devis/Factures**: Requis pour V1 ou reporté V2 ?
5. **Edition guides**: Activer RLS granulaire pour N4+ ou garder N5+ strict ?
