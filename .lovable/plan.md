
# Plan d'implémentation Phase 1 : Médiathèque Centralisée v6

## Objectif
Créer une médiathèque centralisée style Finder avec onglet principal "Documents", modèle Asset+Links, RLS granulaire par scope, et Edge Function pour téléchargement sécurisé.

---

## Phase 1A : Migration SQL (Schema + Fonctions)

### Tables à créer

| Table | Description |
|-------|-------------|
| `media_system_folders` | Dossiers racine système (RH, Véhicules, Admin...) avec `path_slug` normalisé |
| `media_assets` | Fichiers physiques uniques (bucket + path) |
| `media_folders` | Arborescence des dossiers avec héritage `access_scope` |
| `media_links` | Liens N-N entre assets et dossiers (multi-emplacement) |
| `media_system_routes` | Templates de routing par module (ex: `/rh/salaries/{id}/{subfolder}`) |

### Fonctions SQL à créer

| Fonction | Description |
|----------|-------------|
| `sanitize_path_segment(text)` | Normalise les slugs (accents, espaces → tirets) avec fallback 'inconnu' |
| `has_module_option_v2(uuid, text, text)` | Vérifie option module dans `user_modules` table |
| `can_access_folder_scope(uuid, text)` | Vérifie accès selon scope (general/rh/rh_sensitive/admin) |
| `can_manage_media(uuid)` | Vérifie permission `divers_documents.gerer` |
| `ensure_media_folder(uuid, text, text, uuid)` | Création idempotente dossiers avec héritage scope |
| `resolve_route_template(text, jsonb)` | Résolution des templates de route |

### Corrections critiques appliquées

1. **Héritage access_scope** : Les sous-dossiers héritent du scope parent (ex: `/rh/salaries/jean/contrats` hérite de `rh`)
2. **can_access_folder_scope('rh')** : Exige explicitement `rh.rh_viewer` ou `rh.rh_admin`, pas juste N2
3. **Soft-delete corrigé** : Policy UPDATE distincte pour soft-delete avec vérification `is_system = false`
4. **Protection dossiers système** : Trigger bloque rename/move/delete (même soft) sur `is_system = true`
5. **Unique index compatible** : `COALESCE(parent_id, uuid_zero)` au lieu de `NULLS NOT DISTINCT`

### RLS Policies

| Table | SELECT | INSERT | UPDATE | Soft-DELETE |
|-------|--------|--------|--------|-------------|
| `media_folders` | scope + agency | `can_manage_media` | `can_manage_media` | `can_manage_media` + `is_system=false` |
| `media_links` | via folder accessible | `can_manage_media` | `can_manage_media` | `can_manage_media` |
| `media_assets` | via link accessible | `can_manage_media` | `can_manage_media` | - (via GC) |

---

## Phase 1B : Edge Function `media-get-signed-url`

### Flux sécurisé
1. Authentifier l'utilisateur via JWT
2. Vérifier `asset.agency_id === profile.agency_id` (sauf N5+)
3. Vérifier accès via `media_links` + `can_access_folder_scope`
4. Générer signed URL via `supabase.storage.createSignedUrl()`
5. Logger l'accès dans `document_access_logs`

---

## Phase 1C : Triggers de synchronisation

### Trigger `sync_collaborator_document_to_media`
- **Event** : `AFTER INSERT OR UPDATE OR DELETE`
- **Logique** :
  - INSERT : Créer asset + link vers `/rh/salaries/{id}-{nom}/{subfolder}`
  - UPDATE : Si `subfolder` change → soft-delete ancien link + créer nouveau
  - DELETE : Soft-delete le link

---

## Phase 2 : Intégration UI

### Modifications `src/types/modules.ts`
```typescript
divers_documents: {
  consulter: 'divers_documents.consulter',  // Lecture
  gerer: 'divers_documents.gerer',          // CRUD
  corbeille_vider: 'divers_documents.corbeille_vider', // Purge
},
```

### Modifications `src/pages/UnifiedWorkspace.tsx`
- Ajouter `'documents'` dans `UnifiedTab`
- Ajouter tab config avec `requiresOption: { module: 'divers_documents', option: 'consulter' }`
- Mettre à jour `DEFAULT_TAB_ORDER`

### Nouveaux composants
| Composant | Description |
|-----------|-------------|
| `DocumentsTabContent` | Layout 3 sous-onglets (Médiathèque, Raccourcis, Corbeille) |
| `MediaLibraryManager` | Interface Finder principale |
| `MediaSidebar` | Arborescence dossiers |
| `MediaFolderGrid` | Grille dossiers + fichiers |

### Deep-linking
- URL `/?tab=documents&path=/rh/salaries/uuid-jean` ouvre directement le dossier
- Boutons "Voir dans médiathèque" depuis les modules existants

---

## Matrice des droits finale

| Scope | N2 sans RH | N2 avec RH | N3 | N4+ | N5/N6 |
|-------|------------|------------|-----|-----|-------|
| `general` | ✅ (si consulter) | ✅ | ✅ | ✅ | ✅ |
| `rh` | ❌ | ✅ | ✅ (si module) | ✅ | ✅ |
| `rh_sensitive` | ❌ | ❌ (sauf rh_admin) | ❌ | ✅ | ✅ |
| `admin` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Fichiers à créer

### Migration SQL
- `supabase/migrations/xxx_media_library_phase1.sql`

### Edge Functions
- `supabase/functions/media-get-signed-url/index.ts`
- `supabase/functions/media-garbage-collector/index.ts`

### Frontend
- `src/components/unified/tabs/DocumentsTabContent.tsx`
- `src/components/media-library/MediaLibraryManager.tsx`
- `src/components/media-library/MediaSidebar.tsx`
- `src/components/media-library/MediaFolderGrid.tsx`
- `src/components/media-library/MediaContextMenu.tsx`
- `src/components/media-library/MediaQuickLook.tsx`
- `src/hooks/useMediaLibrary.ts`
- `src/hooks/useMediaFolders.ts`
- `src/hooks/useMediaLinks.ts`

---

## Ordre d'exécution

1. ✅ **Jour 1-2** : Migration SQL Phase 1 (tables + fonctions + RLS + triggers)
2. ✅ **Jour 3** : Edge Functions (signed-url + garbage-collector)
3. ✅ **Jour 4** : Hooks React (useMediaLibrary, useMediaFolders, useMediaLinks)
4. ✅ **Jour 5-6** : Composants Finder (Manager, Sidebar, Grid, ContextMenu, QuickLook, Toolbar, Breadcrumb)
5. ✅ **Jour 7** : Intégration onglet Documents dans UnifiedWorkspace + Storage bucket
6. ✅ **Jour 8** : Tests E2E + Trigger sync collaborator_documents → media
7. ✅ **Jour 9** : Finalisation UI (ContextMenuPopover, Sidebar navigation, polish)

---

## Validation technique

✅ Héritage `access_scope` dans `ensure_media_folder()`
✅ `can_access_folder_scope('rh')` basé sur permissions RH explicites
✅ Policies INSERT/UPDATE exigent `divers_documents.gerer`
✅ Signed URL via Edge Function (pas RPC SQL)
✅ Protection dossiers système via trigger
✅ Soft-delete bloqué sur `is_system = true`
✅ Unique index compatible Postgres ≥12
✅ MediaQuickLook avec navigation clavier (←→, Espace, Échap)
✅ MediaContextMenu avec protection dossiers système
✅ Garbage collector avec dry-run et retention configurable
✅ MediaContextMenuPopover positionné pour menu contextuel
✅ MediaSidebar avec arborescence dépliable et navigation dossiers réels

---

## Statut : PHASE 1 COMPLETE

La Médiathèque Centralisée v6 est maintenant fonctionnelle avec :
- Interface Finder complète (Sidebar, Grid, Toolbar, Breadcrumb, QuickLook, ContextMenu)
- Edge Functions sécurisées (signed-url, garbage-collector)
- Synchronisation automatique des documents RH
- RLS granulaire par scope d'accès
