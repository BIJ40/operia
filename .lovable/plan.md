

# Plan de Remédiation Intégral — Toutes Audits Confondus

Tous les problèmes identifiés dans les 5 audits sont consolidés et triés par priorité absolue. L'objectif est de passer le score global de **6.2 → 8.0/10**.

---

## P0 — Critiques (à corriger immédiatement)

### P0-1. Secret hardcodé dans `migrate-export` (Sécurité CVSS 9.8)
- **Fichier :** `supabase/functions/migrate-export/index.ts` ligne 3
- **Problème :** `MIGRATION_SECRET = 'apogee-migrate-2026-secret'` en clair. Quiconque lit le code peut exporter toute la base.
- **Correction :** Remplacer par `Deno.env.get('MIGRATION_SECRET')`, ajouter le secret via le dashboard Supabase Edge Functions secrets.

### P0-2. XSS dans HcServicesSection (Sécurité)
- **Fichier :** `src/components/hc-services-guide/HcServicesSection.tsx` lignes 104, 175
- **Problème :** `dangerouslySetInnerHTML={{ __html: section.content }}` sans sanitization. Seul composant du projet à ne pas utiliser `createSanitizedHtml`.
- **Correction :** Importer `createSanitizedHtml` depuis `@/lib/sanitize` et remplacer les deux occurrences.

### P0-3. Session OTP 365 jours (Sécurité)
- **Fichier :** `supabase/functions/apporteur-auth-verify-code/index.ts` ligne 42
- **Problème :** `SESSION_DURATION_DAYS = 365` — un token volé donne accès pendant 1 an.
- **Correction :** Réduire à `90` jours.

### P0-4. CORS wildcard sur `create-dev-account` (Sécurité)
- **Fichier :** `supabase/functions/create-dev-account/index.ts` lignes 3-6
- **Problème :** `Access-Control-Allow-Origin: '*'` sur un endpoint qui crée des comptes admin. Risque CSRF.
- **Correction :** Utiliser le module partagé `_shared/cors.ts` (`handleCorsPreflightOrReject` + `withCors`).

### P0-5. AuthContext non mémorisé (Performance)
- **Fichier :** `src/contexts/AuthContext.tsx` lignes 523-560
- **Problème :** L'objet `value` du Provider est recréé à chaque render, provoquant des re-renders en cascade sur 113+ composants.
- **Correction :** Wrapper le `value` dans `useMemo` avec les bonnes dépendances.

### P0-6. `accessContext` recréé à chaque render (Performance)
- **Fichier :** `src/contexts/AuthContext.tsx` lignes 160-164
- **Problème :** L'objet `accessContext` est recréé à chaque render, invalidant les callbacks `hasModuleGuard` et `hasModuleOptionGuard`.
- **Correction :** Wrapper dans `useMemo`.

### P0-7. Onglet TEST visible en production (Produit)
- **Fichier :** `src/pages/UnifiedWorkspace.tsx` ligne 168
- **Problème :** L'onglet `{ id: 'test', label: 'TEST', icon: FlaskConical }` est visible par tous les utilisateurs.
- **Correction :** Supprimer la ligne ou conditionner à `import.meta.env.DEV`.

---

## P1 — Haute Priorité

### P1-1. Paralléliser `loadUserData` (Performance)
- **Fichier :** `src/contexts/AuthContext.tsx` lignes 194-204
- **Problème :** Les requêtes `profiles` et `get_user_effective_modules` sont séquentielles.
- **Correction :** Utiliser `Promise.all([profileQuery, modulesQuery])`. Gain estimé : -300ms au login.

### P1-2. Fonctions CRON sans authentification (Sécurité)
- **Fichier :** `supabase/config.toml` — 5 fonctions avec `verify_jwt = false` qui ne sont pas des CRON réelles
- **Problèmes :** `compute-apporteur-metrics`, `export-all-data`, `media-garbage-collector` sont appelables sans auth.
- **Correction :** Ajouter un check `CRON_SECRET` dans chaque fonction (pattern : `req.headers.get('Authorization') === 'Bearer ' + Deno.env.get('CRON_SECRET')`).

### P1-3. Dynamic import `xlsx` (Performance)
- **Fichiers :** `src/prospection/utils/parseProspectExcel.ts`, `src/apogee-tickets/utils/exportKanban.ts`
- **Problème :** `import * as XLSX from 'xlsx'` statique — ~200KB ajoutés au bundle initial.
- **Correction :** `const XLSX = await import('xlsx')` dans les fonctions qui l'utilisent.

### P1-4. Masquer les sous-onglets Guides disabled (Produit/UX)
- **Problème :** 75% des onglets Guides sont `disabled: true` mais restent visibles et grisés, créant de la friction.
- **Correction :** Filtrer les onglets disabled dans le rendu au lieu de les afficher en grisé.

### P1-5. Supprimer table dupliquée (Database)
- **Problème :** `sensitive_data_access_log` et `sensitive_data_access_logs` coexistent.
- **Correction :** Migration SQL pour migrer les données vers la table canonique et supprimer le doublon.

### P1-6. Créer 10 index FK prioritaires (Database)
- **Problème :** 65+ FK sans index — impact sur les JOINs et CASCADE.
- **Correction :** Migration SQL avec `CREATE INDEX CONCURRENTLY` sur les FK les plus utilisées (`apogee_tickets.created_by_user_id`, `faq_items.category_id`, etc.).

---

## P2 — Priorité Moyenne

### P2-1. Split AuthContext en 3 contextes (Architecture + Performance)
- **Fichier :** `src/contexts/AuthContext.tsx` (572 lignes, 113+ consumers)
- **Correction :** Séparer en `AuthSessionContext` (user, login, logout), `ProfileContext` (firstName, lastName, agence), `PermissionsContext` (globalRole, modules, guards). Réduction estimée : -60% re-renders.

### P2-2. Unifier les EditorContext (Architecture)
- **Problème :** 3 variantes quasi-identiques (~1160 lignes dupliquées).
- **Correction :** Créer une factory `createBlocksEditorContext(scope)` et l'instancier pour chaque scope.

### P2-3. Unifier les CategoryPage (Architecture)
- **Problème :** 4 clones quasi-identiques (~1554 lignes dupliquées).
- **Correction :** Créer un `GenericCategoryPage` paramétré par scope.

### P2-4. CORS sur `migrate-export` (Sécurité)
- **Fichier :** `supabase/functions/migrate-export/index.ts` ligne 10
- **Correction :** Utiliser `_shared/cors.ts` au lieu de `'*'`.

### P2-5. Éclater `advanced2.ts` (Architecture)
- **Fichier :** `src/apogee-connect/statia/definitions/advanced2.ts` (2006 lignes)
- **Correction :** Découper par catégorie de métriques (facturation, planning, productivité, etc.).

### P2-6. Éclater `RichTextEditor` (Architecture)
- **Fichier :** ~986 lignes
- **Correction :** Extraire Toolbar, MenuBar, extensions config en sous-composants.

### P2-7. Convertir colonnes text → date (Database)
- **Problème :** `agency_commercial_profile.date_creation` et autres colonnes de dates typées en `text`.
- **Correction :** Migration ALTER COLUMN avec cast.

### P2-8. Renommer "Administratif" → "Organisation" (Produit)
- **Correction :** Changement de label dans la config d'onglets de `UnifiedWorkspace.tsx`.

---

## P3 — Priorité Basse

### P3-1. Ajouter `React.memo` aux composants lourds
- **Problème :** 0 usage de `React.memo` dans tout le projet.
- **Correction :** Ajouter sur les composants de liste (cards, rows, items) les plus rendus.

### P3-2. Remplacer `.select('*')` par des colonnes explicites
- **Problème :** 849 occurrences.
- **Correction :** Commencer par les 10 hooks les plus utilisés.

### P3-3. Ajouter pagination `.range()` sur les requêtes critiques
- **Correction :** Identifier les tables à forte volumétrie et ajouter `.range(0, 49)`.

### P3-4. Organiser les hooks par domaine fonctionnel
- **Problème :** ~80 hooks dans `src/hooks/` sans structure.
- **Correction :** Créer des sous-dossiers par domaine (auth, planning, rh, support).

### P3-5. Squash des migrations
- **Problème :** 397 fichiers de migration.
- **Correction :** Consolider en ~30 migrations thématiques.

### P3-6. DOMPurify : restreindre les attributs `style` et `data-*`
- **Fichier :** `src/lib/sanitize.ts`
- **Correction :** Retirer `style` de `ALLOWED_ATTR` et passer `ALLOW_DATA_ATTR: false`.

### P3-7. Supprimer `enabled_modules` JSONB de `profiles`
- **Problème :** Duplique la table `user_modules`.
- **Correction :** Migration pour supprimer la colonne après vérification qu'elle n'est plus lue.

---

## Ordre d'exécution recommandé

```text
Sprint 1 — Quick Wins (2-3h) → Score 7.5
├── P0-1  Secret migrate-export → env var
├── P0-2  XSS HcServicesSection
├── P0-3  Session OTP 365 → 90
├── P0-4  CORS create-dev-account
├── P0-5  useMemo AuthContext value
├── P0-6  useMemo accessContext
├── P0-7  Supprimer onglet TEST
└── P1-1  Paralléliser loadUserData

Sprint 2 — Sécurité + Perf (3-4h) → Score 8.0
├── P1-2  CRON_SECRET sur fonctions non-auth
├── P1-3  Dynamic import xlsx
├── P1-4  Masquer guides disabled
├── P1-5  Supprimer table dupliquée
├── P1-6  Index FK prioritaires
└── P2-4  CORS migrate-export

Sprint 3 — Refactoring (5j) → Score 8.5
├── P2-1  Split AuthContext
├── P2-2  Unifier EditorContext
├── P2-3  Unifier CategoryPage
├── P2-5  Éclater advanced2.ts
└── P2-6  Éclater RichTextEditor

Sprint 4 — Polish (3j) → Score 8.8+
├── P3-1 à P3-7
└── P2-7, P2-8
```

Je vais commencer l'implémentation par le **Sprint 1** (tous les P0 + P1-1). Confirmez-vous que je peux procéder ?

