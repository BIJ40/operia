
# Plan : Médiathèque Unique + Éradication Legacy Documents

## Objectif
Faire de la **Médiathèque** la source unique de vérité pour TOUS les documents, tout en **supprimant proprement le code et les tables legacy** pour éviter toute confusion future.

---

## Inventaire Legacy à Supprimer

### Tables SQL à supprimer (après migration)
| Table | Usage actuel |
|-------|--------------|
| `collaborator_documents` | Documents RH salariés |
| `collaborator_document_folders` | Dossiers RH salariés |
| `agency_admin_documents` | Documents admin agence |
| `document_access_logs` | Logs d'accès (FK vers collaborator_documents) |

### Fonctions SQL à supprimer
- `search_collaborator_documents` (RPC)
- `sync_collaborator_doc_to_media` (trigger) 
- `sync_admin_doc_to_media` (trigger)
- Triggers associés

### Hooks TypeScript à supprimer
| Fichier | Remplacé par |
|---------|--------------|
| `useCollaboratorDocuments.ts` | `useScopedMediaLibrary` |
| `useNestedFolders.ts` | `useMediaFolders` (scoped) |
| `useDocumentFolders.ts` | `useMediaFolders` (scoped) |
| `useSubfolders.ts` | `useMediaFolders` (scoped) |
| `useDocumentSearch.ts` | `useMediaLibrary.filters.search` |
| `useAgencyAdminDocuments.ts` | `useScopedMediaLibrary` |

### Composants à supprimer (src/components/collaborators/documents/)
| Composant | Remplacé par |
|-----------|--------------|
| `DocumentBreadcrumb.tsx` | `MediaBreadcrumbNav` |
| `DocumentCategoryTabs.tsx` | Supprimé (structure dossiers) |
| `DocumentDropzone.tsx` | Intégré dans `MediaToolbar` |
| `DocumentGrid.tsx` | `MediaFolderGrid` |
| `DocumentItem.tsx` | Intégré dans `MediaFolderGrid` |
| `DocumentListView.tsx` | `MediaFolderGrid` (mode list) |
| `DocumentPreviewModal.tsx` | `MediaQuickLook` |
| `DocumentSearchBar.tsx` | `MediaToolbar` (search) |
| `DocumentTypeSelector.tsx` | Supprimé |
| `DraggableDocumentItem.tsx` | Supprimé (DnD natif Media) |
| `DroppableFolder.tsx` | Supprimé |
| `FolderGridView.tsx` | `MediaFolderGrid` |
| `FolderNavigationBar.tsx` | `MediaBreadcrumbNav` + `MediaToolbar` |
| `ReadOnlyDocumentGrid.tsx` | `MediaFolderGrid` (canManage=false) |
| `ReadOnlyDocumentItem.tsx` | Supprimé |
| `ReadOnlyDocumentBreadcrumb.tsx` | Supprimé |
| `ReadOnlySubfolderButtons.tsx` | Supprimé |
| `SubfolderButtons.tsx` | Supprimé |
| `HRDocumentViewer.tsx` | `MediaLibraryPortal` |

### Types à nettoyer
- `src/types/collaboratorDocument.ts` → Supprimer ou archiver

---

## Architecture Cible

```text
┌─────────────────────────────────────────────────────────────────┐
│                    MÉDIATHÈQUE CENTRALE                         │
│  media_folders + media_assets + media_links                     │
│                                                                 │
│  /                                                              │
│  ├── rh/                                                        │
│  │   └── salaries/                                              │
│  │       ├── dupont-jean/                                       │
│  │       │   ├── Contrats/                                      │
│  │       │   ├── Salaires/                                      │
│  │       │   └── [fichiers]                                     │
│  │       └── martin-alice/                                      │
│  │                                                              │
│  ├── admin/                                                     │
│  │   ├── Kbis/                                                  │
│  │   ├── RC-Decennale/                                          │
│  │   └── ...                                                    │
│  │                                                              │
│  └── reunions/                                                  │
│      └── ...                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Salarié   │        │ Admin     │        │ Réunions  │
  │ Documents │        │ Documents │        │ Documents │
  └───────────┘        └───────────┘        └───────────┘
  Scope: /rh/         Scope: /admin         Scope: /reunions
  salaries/{id}
```

---

## Étapes d'Implémentation

### Phase 1 : Nouveaux hooks et composants réutilisables

**1.1 Créer `useScopedMediaLibrary.ts`**
Hook qui encapsule `useMediaLibrary` avec un dossier racine fixe.

**1.2 Créer `MediaLibraryPortal.tsx`**
Composant réutilisable pour afficher la médiathèque dans un contexte scopé (sans sidebar latérale).

**Props principales :**
- `rootPath` : Chemin du dossier racine (ex: `/rh/salaries/{collaborator_id}`)
- `canManage` : Autorise les modifications
- `showBreadcrumbRoot` : Affiche ou non la racine dans le breadcrumb

### Phase 2 : Migration des données existantes

**2.1 Migration SQL des documents collaborateurs**
Vérifier que tous les documents de `collaborator_documents` sont dans `media_links`.
(Le trigger existant les a normalement déjà synchronisés)

**2.2 Migration SQL des documents admin**
Idem pour `agency_admin_documents`.

**2.3 Script de vérification**
Avant suppression, vérifier qu'aucun document n'est orphelin.

### Phase 3 : Remplacement des vues UI

**3.1 `HRDocumentManager.tsx`**
- Supprimer tout le code actuel
- Remplacer par `<MediaLibraryPortal rootPath="/rh/salaries/{collaborator_id}" canManage={canManage} />`

**3.2 `AgencyAdminDocuments.tsx`**  
- Conserver l'UI actuelle (liste avec statuts/expiration) OU
- Ajouter un bouton "Voir dans médiathèque" en deep-link
- Les uploads utilisent la médiathèque en arrière-plan

**3.3 `DocumentsTab.tsx`**
- Simplifier pour juste wrapper `MediaLibraryPortal`

### Phase 4 : Nettoyage total du legacy

**4.1 Migration SQL de suppression**
Après validation du fonctionnement :
- DROP TABLE `collaborator_documents` CASCADE
- DROP TABLE `collaborator_document_folders` CASCADE
- DROP TABLE `document_access_logs` CASCADE
- DROP TABLE `agency_admin_documents` CASCADE
- DROP FUNCTION `sync_collaborator_doc_to_media`
- DROP FUNCTION `sync_admin_doc_to_media`
- DROP FUNCTION `search_collaborator_documents`

**4.2 Suppression des fichiers TypeScript**
- Supprimer tous les hooks listés ci-dessus
- Supprimer tous les composants `src/components/collaborators/documents/*`
- Supprimer ou archiver les types

**4.3 Mise à jour de l'index**
- `src/components/collaborators/documents/index.ts` → Supprimer
- Mettre à jour les imports dans les fichiers qui les utilisaient

### Phase 5 : Nettoyage edge functions

**5.1 `generate-hr-document`**
Modifier pour créer dans `media_assets` + `media_links` au lieu de `collaborator_documents`

**5.2 `export-rh-documents`**  
Modifier pour lire depuis `media_links` au lieu de `collaborator_documents`

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/hooks/useScopedMediaLibrary.ts` | Hook pour vue scopée de la médiathèque |
| `src/components/media-library/MediaLibraryPortal.tsx` | Composant Finder intégrable |

## Fichiers à modifier significativement

| Fichier | Modification |
|---------|--------------|
| `src/components/collaborators/documents/HRDocumentManager.tsx` | Remplacement total par MediaLibraryPortal |
| `src/components/collaborators/DocumentsTab.tsx` | Simplification |
| `supabase/functions/generate-hr-document/index.ts` | Écrire dans media_* |
| `supabase/functions/export-rh-documents/index.ts` | Lire depuis media_* |

## Fichiers à supprimer

**Hooks (7 fichiers) :**
- `useCollaboratorDocuments.ts`
- `useNestedFolders.ts`  
- `useDocumentFolders.ts`
- `useSubfolders.ts`
- `useDocumentSearch.ts`
- `useAgencyAdminDocuments.ts` (potentiellement)

**Composants (20 fichiers) :**
- Tout le dossier `src/components/collaborators/documents/` sauf `HRDocumentManager.tsx` (réécrit)

**Types :**
- `src/types/collaboratorDocument.ts`

---

## Stratégie de migration sans perte

1. **Avant toute suppression** : Vérifier via SQL que tous les documents legacy existent dans `media_links`
2. **Désactiver les triggers** d'abord (pour éviter les doublons)  
3. **Tester la nouvelle UI** avec les données migrées
4. **Supprimer les tables** seulement après validation utilisateur

---

## Avantages du nettoyage

| Avant | Après |
|-------|-------|
| 2 systèmes de documents parallèles | 1 seul système unifié |
| ~20 composants spécifiques RH | Réutilisation composants Media |
| ~7 hooks documents | 3 hooks Media existants |
| 4 tables legacy + triggers de sync | 3 tables Media natives |
| Synchronisation complexe | Source unique de vérité |
| Code difficile à maintenir | Architecture propre |

---

## Estimation

- **Complexité** : Haute (migration données + réécriture UI + nettoyage)
- **Temps** : 4-5 itérations
- **Risque** : Moyen (atténué par vérification pré-suppression)
