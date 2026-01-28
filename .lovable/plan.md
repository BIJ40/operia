
# Audit EXHAUSTIF Section ADMIN - Inventaire Complet

## Résumé du problème
Quand on accède à une page admin via URL directe (ex: `/admin/gestion`), l'ancien système de header/layout (legacy) s'affiche au lieu du workspace unifié minimal.

---

## INVENTAIRE COMPLET PAGES ADMIN

### 1. Page Index Admin (`/admin` → redirigé vers `/?tab=admin`)
**Fichier** : `src/pages/AdminIndex.tsx`
**Sous-onglets internes (PillTabs)** :
- `gestion` - Gestion
- `ia` - IA  
- `support` - Support
- `donnees` - Données
- `systeme` - Système

---

### 2. Routes ADMIN (27 routes dans `admin.routes.tsx`)

| # | Route | Page | Layout actuel | Onglets internes |
|---|-------|------|---------------|------------------|
| 1 | `/admin` | Redirect → `/?tab=admin` | — | — |
| 2 | `/admin/gestion` | `TDRUsersPage` | `AdminLayout` (MinimalLayout) | ❌ |
| 3 | `/admin/agencies` | `AdminAgencies` | `AdminLayout` | ❌ |
| 4 | `/admin/agencies/:agencyId` | `FranchiseurAgencyProfile` | `AdminLayout` | Sous-routes |
| 5 | `/admin/user-activity` | `AdminUserActivity` | `AdminLayout` | 2 onglets (7j/30j) |
| 6 | `/admin/feature-flags` | `AdminFeatureFlags` | `AdminLayout` | ❌ |
| 7 | `/admin/hidden-features` | `HiddenFeaturesPage` | `AdminLayout` | ❌ |
| 8 | `/admin/helpi` | `AdminHelpi` | `AdminLayout` | **8 onglets** : Dashboard, Indexer, Tester, Questions, Lacunes, Stats, Ingestion, Config |
| 9 | `/admin/apogee-guides` | `AdminApogeeGuides` | `AdminLayout` | ❌ |
| 10 | `/admin/statia-by-bij` | `StatiaBuilderAdminPage` | `AdminLayout` | **2 onglets** : Vue Métriques, Validator Hub |
| 11 | `/admin/statia-validator` | `StatiaValidatorPage` | `AdminLayout` | ❌ |
| 12 | `/admin/faq` | `AdminFaq` | `AdminLayout` | Vue Hub + Vue Context |
| 13 | `/admin/announcements` | `AdminAnnouncements` | `AdminLayout` | ❌ |
| 14 | `/admin/support/settings` | `SupportSettings` | `AdminLayout` | ❌ |
| 15 | `/admin/backup` | `AdminBackup` | `AdminLayout` | **3 onglets** : Export Complet, Export Catégorie, Sauvegarde Complète |
| 16 | `/admin/helpconfort-backup` | `AdminHelpConfortBackup` | `AdminLayout` | **3 onglets** : Export complet, Export par catégorie, Import |
| 17 | `/admin/cache-backup` | `AdminCacheBackup` | `AdminLayout` | ❌ |
| 18 | `/admin/storage-quota` | `AdminStorageQuota` | `AdminLayout` | ❌ |
| 19 | `/admin/system-health` | `AdminSystemHealth` | `AdminLayout` | **3 onglets** : Vue d'ensemble, Métriques temps réel, Outils |
| 20 | `/admin/page-metadata` | `AdminPageMetadata` | `AdminLayout` | ❌ |
| 21 | `/admin/notifications` | `AdminNotificationSender` | `AdminLayout` | ❌ |
| 22 | `/admin/apogee-report` | `AdminApogeeReport` | `AdminLayout` | ❌ |
| 23 | `/admin/flow` | `AdminFlow` | `AdminLayout` | ❌ |
| 24 | `/admin/templates` | `DocTemplatesPage` | `AdminLayout` | ❌ |
| 25 | `/admin/apporteurs` | `AdminApporteurs` | `AdminLayout` | ❌ |
| 26 | `/admin/rapportactivite` | `ReportActivityPage` | `AdminLayout` | **2 onglets** : Paramètres, Historique |
| 27 | `/admin/sitemap` | `AdminSitemap` | `AdminLayout` | **3 onglets** : Arborescence, Tableau, Diagramme |

---

### 3. DIALOGS/POPUPS Admin (par page)

| Page | Dialogs |
|------|---------|
| `TDRUsersPage` | CreateUserDialog, EditUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog |
| `AdminAgencies` | Dialog création/édition agence |
| `AdminFeatureFlags` | DropdownMenu statut dev |
| `AdminHelpi` | ImproveGuideDialog, DocumentDetailsDialog (dans sous-onglets) |
| `AdminFaq` | FaqEditDialog |
| `AdminAnnouncements` | AnnouncementForm, AlertDialog suppression |
| `AdminApogeeGuides` | Dialog création/édition guide |
| `AdminApporteurs` | ApporteurCreateDialog, ApporteurDetailDrawer |
| `DocTemplatesPage` | Dialog création template, TokenConfigEditor |
| `AdminNotificationSender` | — (formulaire inline) |
| `UnifiedManagementPage` | CreateUserDialog, EditUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog |

---

### 4. Redirections Legacy (déjà gérées)

```
/admin/documents → /?tab=admin
/admin/chatbot-rag → /?tab=admin  
/admin/support-tickets → /projects/kanban
/admin/support-stats → /projects/kanban
/admin/escalation-history → /projects/kanban
/admin/apogee-tickets → /projects/kanban
/admin/formation-generator → /?tab=admin
/admin/statia-builder → /admin/statia-by-bij
/admin/modules → /admin/feature-flags
/admin/permissions-center → /admin/gestion
/admin/droits → /admin/gestion
/admin/gestionV2 → /admin/gestion
```

---

## LE PROBLÈME : `TDRUsersPage` utilise `FranchiseurPageContainer`

**Cause identifiée** : La page `/admin/gestion` utilise `TDRUsersPage` qui contient :
- `FranchiseurPageContainer`
- `FranchiseurPageHeader`

Ces composants affichent l'ancien header "Franchiseur" au lieu de s'intégrer au MinimalLayout !

**Fichiers concernés** :
1. `src/pages/TDRUsersPage.tsx` (ligne 152, 162-163)
2. `src/franchiseur/components/layout/FranchiseurPageContainer.tsx`
3. `src/franchiseur/components/layout/FranchiseurPageHeader.tsx`

---

## PLAN DE CORRECTION

### Étape 1 : Neutraliser `FranchiseurPageContainer` dans `TDRUsersPage`

Remplacer :
```tsx
<FranchiseurPageContainer>
  <FranchiseurPageHeader ... />
  ...
</FranchiseurPageContainer>
```

Par un simple conteneur neutre :
```tsx
<div className="container py-6 space-y-6">
  <PageHeader ... /> // Utiliser le PageHeader standard
  ...
</div>
```

### Étape 2 : Vérifier que toutes les pages utilisent `AdminLayout`

Toutes les routes dans `admin.routes.tsx` utilisent déjà `AdminLayout` qui wrape `MinimalLayout`. ✅

### Étape 3 : Vérifier `UnifiedManagementPage` (alternative à TDRUsersPage)

Ce composant a été corrigé dans la précédente session - il n'utilise pas de layout legacy.

---

## FICHIERS À MODIFIER

| Fichier | Action |
|---------|--------|
| `src/pages/TDRUsersPage.tsx` | Remplacer `FranchiseurPageContainer` + `FranchiseurPageHeader` par conteneur neutre + `PageHeader` standard |

---

## RÉSULTAT ATTENDU

- Accès direct à `/admin/gestion` → affiche le **MinimalLayout** avec barre de navigation minimale en haut
- Plus AUCUN ancien header "Franchiseur" ou système d'onglets legacy visible
- Cohérence visuelle avec l'ensemble du workspace unifié

