# P3 - Sprint 3: Modules & Data Model

## Vue d'ensemble

Sprint 3 nettoie et unifie le modèle de données V2 en éliminant les duplications, en centralisant les registres, et en renforçant les contraintes base de données.

---

## P3.1 - Registre centralisé des scopes ✅

**Objectif**: Source unique de vérité pour tous les scopes applicatifs.

### Implémentation

**Fichier**: `src/config/scopeRegistry.ts`
```typescript
export const SCOPE_SLUGS = {
  HELP_ACADEMY_APOGEE: 'help_academy_apogee',
  PILOTAGE_MES_INDICATEURS: 'pilotage_mes_indicateurs',
  SUPPORT_CONSOLE: 'support_console',
  // ... tous les scopes
} as const;

export type ScopeSlug = typeof SCOPE_SLUGS[keyof typeof SCOPE_SLUGS];
```

**Impact**:
- Élimination des duplications de scope definitions
- Type-safety pour tous les scope slugs
- Import centralisé: `import { SCOPE_SLUGS } from '@/config/scopeRegistry'`

---

## P3.2 - Format unique `enabled_modules` V2 ✅

**Objectif**: Documentation et standardisation de la structure JSONB `enabled_modules`.

### Structure canonique

**Fichier**: `src/config/enabledModulesV2.md`

```typescript
type EnabledModules = {
  [moduleKey: string]: {
    enabled: boolean;
    options?: {
      [optionKey: string]: boolean | string | number;
    };
  };
};
```

### Modules disponibles

| Module | Options disponibles |
|--------|---------------------|
| `help_academy` | `apogee`, `apporteurs`, `helpconfort`, `documents` |
| `pilotage_agence` | `mes_indicateurs`, `actions_a_mener`, `diffusion` |
| `support` | `mes_demandes`, `agent` (console access) |
| `reseau_franchiseur` | `dashboard`, `kpi`, `agencies`, `royalties` |
| `apogee_tickets` | `kanban`, `manage`, `import` |

**Migration legacy → V2**: Automatique via `getEnabledModulesFromLegacy()` dans `AuthContext.tsx`.

---

## P3.3 - Suppression `has_franchiseur_role()` des RLS ✅

**Objectif**: Éliminer la fonction `has_franchiseur_role()` des policies RLS et utiliser uniquement `has_min_global_role()` + `can_access_agency()`.

### Changements

**Base de données**:
- Fonction `has_franchiseur_role(uuid, franchiseur_role)` supprimée
- Policies sur `franchiseur_agency_assignments` réécrits:
  - Ancien: `has_franchiseur_role(auth.uid(), 'directeur_reseau')`
  - Nouveau: `has_min_global_role(auth.uid(), 4)` (N4+)

**Résultat**:
- Table `franchiseur_roles` conservée uniquement comme rôle métier (affichage UI)
- RLS unifié sur `global_role` (N0-N6) + `franchiseur_agency_assignments`
- Séparation claire: autorisation (global_role) vs. métier (franchiseur_role)

---

## P3.4 - Enum `context_type` RAG ✅

**Objectif**: Transformer le champ texte libre `context_type` en enum PostgreSQL strict pour empêcher les valeurs invalides.

### Migration SQL

**Enum créé**:
```sql
CREATE TYPE public.rag_context_type AS ENUM (
  'apogee',
  'apporteurs',
  'helpconfort',
  'metier',
  'franchise',
  'documents',
  'auto'
);
```

**Tables migrées**:
- `guide_chunks.context_type` → `rag_context_type NOT NULL`
- `rag_index_documents.context_type` → `rag_context_type`
- `faq_items.context_type` → `rag_context_type NOT NULL DEFAULT 'documents'`
- `chatbot_queries.context_type_used` → `rag_context_type`

**Contrainte DB**: Impossible d'insérer une valeur non autorisée → erreur PostgreSQL immédiate.

### Code TypeScript

**Type aligné**:
```typescript
// src/lib/rag-michu.ts
export type RAGContextType = 'apogee' | 'apporteurs' | 'helpconfort' | 'documents' | 'metier' | 'franchise' | 'auto';
```

**Corrections**:
- `rag-improvement.ts`: Cast explicite `contextType as RAGContextType`
- `rag-ingestion.ts`: Utilisation directe `context_type: detectedContext`
- Tous les inserts utilisent maintenant `insert([{ ... }])` avec array wrapper

---

## P3.5 - `heat_priority` unique ✅

**Objectif**: Éliminer le champ texte `priority` et utiliser uniquement `heat_priority` (0-12) comme référence.

### Migration SQL

**Mapping legacy → heat**:
```sql
UPDATE apogee_tickets
SET heat_priority = CASE
  WHEN priority = 'bloquant' THEN 12
  WHEN priority = 'critique' THEN 11
  WHEN priority = 'urgent' THEN 9
  WHEN priority = 'élevé' THEN 8
  WHEN priority = 'important' THEN 7
  WHEN priority = 'moyen' THEN 6
  WHEN priority = 'normal' THEN 5
  WHEN priority = 'faible' THEN 3
  WHEN priority = 'très faible' THEN 1
  ELSE 6
END
WHERE heat_priority IS NULL AND priority IS NOT NULL;
```

**Nettoyage**:
```sql
ALTER TABLE apogee_tickets
  ALTER COLUMN heat_priority SET NOT NULL,
  ALTER COLUMN heat_priority SET DEFAULT 6;

ALTER TABLE apogee_tickets DROP COLUMN priority;
```

### Code TypeScript

**Hook corrigé**: `useRecalculateHeatPriority.ts`
```typescript
// Avant
.select('id, source_sheet, priority')
heat_priority: calculateHeatPriority(ticket.source_sheet, ticket.priority)

// Après
.select('id, source_sheet, heat_priority')
heat_priority: calculateHeatPriority(ticket.source_sheet, ticket.heat_priority)
```

**Impact**:
- Affichage: `HeatPriorityBadge` travaille uniquement sur `heat_priority`
- Tri/filtres: colonne unique `heat_priority`
- SLA/Analytics: score homogène support + Apogée

---

## Résultat Sprint 3

### Changements base de données
- ✅ Fonction `has_franchiseur_role()` supprimée
- ✅ Enum `rag_context_type` créé et appliqué sur 4 tables
- ✅ Colonne `apogee_tickets.priority` supprimée
- ✅ Colonne `apogee_tickets.heat_priority` NOT NULL DEFAULT 6

### Changements code
- ✅ `src/config/scopeRegistry.ts` - registre centralisé des scopes
- ✅ `src/config/enabledModulesV2.md` - documentation format V2
- ✅ Corrections TypeScript: `useRecalculateHeatPriority`, `rag-improvement`, `rag-ingestion`, `rag-michu`

### Garanties
- **Type safety**: Enum PostgreSQL empêche valeurs RAG invalides
- **Unification priorité**: Un seul score (0-12) pour tout le système
- **RLS simplifié**: Plus de dépendance `franchiseur_roles` dans policies
- **Centralisation**: Registre unique pour scopes et modules

---

## Changelog

Ajout dans `src/config/changelog.ts`:
```typescript
{
  version: 'V0.5.0',
  date: '2025-12-01',
  changes: [
    // ... changements P1 et P2 ...
    {
      type: 'infrastructure',
      scope: 'data-model',
      description: 'P3.1 - Registre centralisé des scopes (scopeRegistry.ts)',
    },
    {
      type: 'infrastructure',
      scope: 'data-model',
      description: 'P3.2 - Documentation format unique enabled_modules V2',
    },
    {
      type: 'security',
      scope: 'rls',
      description: 'P3.3 - Suppression has_franchiseur_role() des RLS',
    },
    {
      type: 'infrastructure',
      scope: 'rag',
      description: 'P3.4 - Enum strict rag_context_type (7 valeurs autorisées)',
    },
    {
      type: 'feature',
      scope: 'apogee-tickets',
      description: 'P3.5 - heat_priority unique (suppression priority texte)',
    },
  ],
}
```
