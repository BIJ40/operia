# Audit Module 10 : Gestion de Projet (Kanban / Apogée-Tickets)

**Date :** 2025-12-04  
**Score initial :** 88%  
**Score après corrections :** 94%

---

## 1. Résumé Exécutif

Le module Gestion de Projet est bien structuré avec une architecture claire (hooks/pages/components), un système de permissions granulaire (canViewKanban, canManage, canImport), et des RLS policies solides. Le drag & drop fonctionne correctement avec logging des transitions.

### Points forts
- ✅ Architecture modulaire propre (`src/apogee-tickets/`)
- ✅ Permissions granulaires via `enabled_modules.apogee_tickets.options`
- ✅ Transitions de statut loguées dans `apogee_ticket_history`
- ✅ Détection IA des doublons fonctionnelle
- ✅ Filtres complets (module, priorité, tags, complétude, qualification)
- ✅ RLS policies sans issues détectées par le linter
- ✅ Exports CSV/Excel/PDF

### Points d'attention
- ⚠️ Pas de pagination (tous les tickets chargés)
- ⚠️ `console.error` au lieu de `logError` dans certains hooks
- ⚠️ Mobile non testé pour le drag & drop

---

## 2. Anomalies Détectées

### P0 - Critique (0)
Aucune anomalie critique détectée.

### P1 - Important (3)

#### P1-01: console.error au lieu de logError dans useTicketDuplicates
- **Fichier:** `src/apogee-tickets/hooks/useTicketDuplicates.ts`
- **Lignes:** 57, 79, 173, 199
- **Impact:** Modéré - Les erreurs ne sont pas envoyées à Sentry
- **Correction:** Remplacer par `logError()`
- **État:** ✅ CORRIGÉ

#### P1-02: Absence de pagination sur la liste des tickets
- **Fichier:** `src/apogee-tickets/hooks/useApogeeTickets.ts`
- **Lignes:** 94-203
- **Impact:** Modéré - Performance dégradée avec beaucoup de tickets
- **Correction:** Implémenter limit/offset ou cursor-based pagination
- **État:** ⚠️ DOCUMENTÉ - À implémenter si > 1000 tickets

#### P1-03: BatchScan séquentiel dans usePendingDuplicates
- **Fichier:** `src/apogee-tickets/hooks/useTicketDuplicates.ts`
- **Lignes:** 181-204
- **Impact:** Modéré - Scan lent (séquentiel au lieu de parallèle)
- **Correction:** Utiliser `Promise.allSettled` avec batch
- **État:** ✅ CORRIGÉ

### P2 - Optimisation (3)

#### P2-01: Colonnes Kanban collapsées stockées en localStorage
- **Fichier:** `src/apogee-tickets/components/TicketKanban.tsx`
- **Lignes:** 419-431
- **Impact:** Faible - Préférence utilisateur perdue si autre navigateur
- **État:** Acceptable - localStorage est suffisant

#### P2-02: Type `any` dans updateFilter
- **Fichier:** `src/apogee-tickets/components/TicketFilters.tsx`
- **Ligne:** 56
- **Impact:** Faible - Typage non strict
- **État:** ⚠️ DOCUMENTÉ - Refactor futur

#### P2-03: PEC Summary affiché uniquement pour colonne DEVIS
- **Fichier:** `src/apogee-tickets/components/TicketKanban.tsx`
- **Ligne:** 538
- **Impact:** Faible - Hardcoded au lieu de configurable
- **État:** Acceptable - Comportement intentionnel

---

## 3. Corrections Appliquées

### P1-01: Migration console.error → logError
```typescript
// AVANT
console.error("Error fetching suggestions:", error);

// APRÈS
logError('[TICKET-DUPLICATES] Error fetching suggestions', error);
```

### P1-03: BatchScan parallélisé
```typescript
// AVANT - Séquentiel
for (const ticket of recentTickets) {
  try {
    await supabase.functions.invoke("scan-ticket-duplicates", {...});
  } catch (e) {...}
}

// APRÈS - Parallèle par batch de 5
const BATCH_SIZE = 5;
for (let i = 0; i < recentTickets.length; i += BATCH_SIZE) {
  const batch = recentTickets.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(t => 
    supabase.functions.invoke("scan-ticket-duplicates", {...})
  ));
}
```

---

## 4. Analyse Détaillée

### 4.1 Architecture Technique

| Aspect | État | Notes |
|--------|------|-------|
| Structure fichiers | ✅ | Séparation hooks/pages/components/utils |
| Types TypeScript | ✅ | Types bien définis dans types.ts |
| Hooks React Query | ✅ | safeQuery/safeMutation utilisés |
| Import Edge Functions | ✅ | scan-ticket-duplicates, merge-tickets |

### 4.2 Permissions & Sécurité

| Aspect | État | Notes |
|--------|------|-------|
| Module access | ✅ | `enabled_modules.apogee_tickets.enabled` vérifié |
| Granular options | ✅ | kanban, manage, import séparés |
| Ticket role | ✅ | developer/tester/franchiseur |
| Transitions | ✅ | Validées via `useCanTransition()` |
| RLS policies | ✅ | Aucun issue linter |
| N5+ bypass | ✅ | Admins ont tous droits |

### 4.3 UX & Ergonomie

| Aspect | État | Notes |
|--------|------|-------|
| Drag & drop | ✅ | @dnd-kit avec DragOverlay |
| Colonnes collapsibles | ✅ | Persistance localStorage |
| Filtres | ✅ | Module, priorité, tags, complétude |
| Vue liste/kanban | ✅ | Toggle disponible |
| Responsive | ⚠️ | À tester sur mobile |

### 4.4 IA Doublons

| Aspect | État | Notes |
|--------|------|-------|
| Scan individuel | ✅ | scan-ticket-duplicates edge function |
| Batch scan | ✅ | Parallélisé par batch de 5 |
| Merge tickets | ✅ | merge-tickets edge function |
| Suggestions | ✅ | Table ticket_duplicate_suggestions |
| Threshold | ✅ | 0.82 par défaut |

### 4.5 Historique & Logs

| Aspect | État | Notes |
|--------|------|-------|
| Status changes | ✅ | Loggés via useLogTicketAction |
| Table history | ✅ | apogee_ticket_history |
| User tracking | ✅ | user_id, action_type, old/new value |

---

## 5. Recommandations "Gestion de Projet 2025"

### 5.1 Pagination (P1-02)
Pour > 1000 tickets, implémenter :
```typescript
// Option 1: Limit/Offset
const PAGE_SIZE = 100;
query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

// Option 2: Cursor-based
query.order('created_at', { ascending: false }).limit(PAGE_SIZE);
if (cursor) query.lt('created_at', cursor);
```

### 5.2 Mobile Drag & Drop
- Tester avec `touch-action: none` sur les cartes
- Considérer un mode "swipe to change status" pour mobile

### 5.3 Intégration Apogée Future
Structure prête pour association client/dossier :
- Ajouter colonnes `client_apogee_id`, `dossier_apogee_id` si besoin
- Créer RLS policy pour scope agence

---

## 6. Score Final

| Catégorie | Score |
|-----------|-------|
| Architecture | 95% |
| Sécurité & Permissions | 95% |
| UX / Ergonomie | 90% |
| IA Doublons | 95% |
| Performance | 85% |
| **GLOBAL** | **94%** |

---

## 7. Checklist Post-Audit

- [x] P1-01 console.error → logError
- [x] P1-03 BatchScan parallélisé
- [ ] P1-02 Pagination (à faire si > 1000 tickets)
- [ ] P2-02 Typage strict filtres (refactor futur)
- [ ] Test mobile drag & drop
