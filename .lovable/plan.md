

# Plan de Refonte : Admin → Modèle Workspace à 6 Onglets

## Vision Globale

Transformer `/admin` d'une interface à tuiles vers un modèle **"workspace direct"** où chaque onglet affiche directement son contenu (tables, formulaires, dashboards) sans écran intermédiaire.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        ESPACE ADMINISTRATION                               │
├────────┬─────────┬────────┬──────────┬────────┬──────────────┬────────────│
│ Accès  │ Réseau  │   IA   │ Contenu  │  Ops   │  Plateforme  │  (active)  │
└────────┴─────────┴────────┴──────────┴────────┴──────────────┴────────────┘
│                                                                            │
│   [Contenu direct de l'onglet sélectionné]                                │
│   - Pas d'écran intermédiaire                                              │
│   - Sous-onglets pills si plusieurs vues                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Structure des 6 Onglets Principaux

| Onglet | ID | Sous-vues (pills) | Pages existantes réutilisées |
|--------|-----|-------------------|------------------------------|
| **Accès** | `acces` | Utilisateurs, Activité, Flags | `TDRUsersPage`, `AdminUserActivity`, `AdminFeatureFlags` |
| **Réseau** | `reseau` | Agences, (détail split) | `AdminAgencies`, `FranchiseurAgencyProfile` |
| **IA** | `ia` | Helpi*, STATiA, Validator | `AdminHelpi`*, `StatiaBuilderAdminPage`, `StatiaValidatorPage` |
| **Contenu** | `contenu` | Guides, FAQ, Templates, Annonces, Notifs, Métadonnées | 6 pages existantes |
| **Ops** | `ops` | Backups, HC-Backup, Cache, Rapport Apogée, Stockage | 5 pages existantes |
| **Plateforme** | `plateforme` | Santé*, Sitemap, Hidden, Flow | 4 pages existantes |

> *Helpi et Santé gardent leurs sous-onglets internes (8 et 3 tabs respectivement)

---

## 2. Architecture Technique

### A) Nouveau composant `AdminHub`

Remplace `AdminIndex.tsx` — devient le point d'entrée unique de l'onglet Admin :

```tsx
// src/components/unified/tabs/AdminHubContent.tsx

const ADMIN_MAIN_TABS = [
  { id: 'acces', label: 'Accès', icon: Shield },
  { id: 'reseau', label: 'Réseau', icon: Building2 },
  { id: 'ia', label: 'IA', icon: Brain },
  { id: 'contenu', label: 'Contenu', icon: FileText },
  { id: 'ops', label: 'Ops', icon: Database },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu },
];

// Chaque onglet principal a ses sous-vues (pills)
const ADMIN_SUB_VIEWS = {
  acces: [
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'activity', label: 'Activité', icon: Activity },
    { id: 'flags', label: 'Feature Flags', icon: ToggleRight },
  ],
  reseau: [
    { id: 'agencies', label: 'Agences', icon: Building2 },
  ],
  ia: [
    { id: 'helpi', label: 'Helpi', icon: Bot },
    { id: 'statia', label: 'STATiA', icon: FlaskConical },
    { id: 'validator', label: 'Validator', icon: FlaskConical },
  ],
  // ... etc
};
```

### B) Gestion de l'état via URL params

Navigation interne pilotée par query params pour cohérence avec le workspace unifié :

```
/?tab=admin&adminTab=acces&adminView=users
/?tab=admin&adminTab=ia&adminView=helpi
```

### C) Sous-onglets en "Pill Tabs"

Réutilisation du composant `PillTabsList` existant (même style que Stats, Guides) :

```tsx
<PillTabsList tabs={ADMIN_SUB_VIEWS[activeTab]} />
```

---

## 3. Mapping Routes → Onglets/Vues

| Route existante | Onglet | Vue | Action |
|-----------------|--------|-----|--------|
| `/admin/gestion` | Accès | users | Embed `TDRUsersPage` |
| `/admin/user-activity` | Accès | activity | Embed `AdminUserActivity` |
| `/admin/feature-flags` | Accès | flags | Embed `AdminFeatureFlags` |
| `/admin/agencies` | Réseau | agencies | Embed `AdminAgencies` |
| `/admin/agencies/:id` | Réseau | agencies | Modal/Sheet détail |
| `/admin/helpi` | IA | helpi | Embed `AdminHelpi` (garde ses 8 tabs) |
| `/admin/statia-by-bij` | IA | statia | Embed `StatiaBuilderAdminPage` |
| `/admin/statia-validator` | IA | validator | Embed `StatiaValidatorPage` |
| `/admin/apogee-guides` | Contenu | guides | Embed page |
| `/admin/faq` | Contenu | faq | Embed page |
| `/admin/templates` | Contenu | templates | Embed page |
| `/admin/announcements` | Contenu | annonces | Embed page |
| `/admin/notifications` | Contenu | notifs | Embed page |
| `/admin/page-metadata` | Contenu | metadata | Embed page |
| `/admin/backup` | Ops | backup | Embed page |
| `/admin/helpconfort-backup` | Ops | hc-backup | Embed page |
| `/admin/cache-backup` | Ops | cache | Embed page |
| `/admin/apogee-report` | Ops | report | Embed page |
| `/admin/storage-quota` | Ops | storage | Embed page |
| `/admin/system-health` | Plateforme | health | Embed (garde ses 3 tabs) |
| `/admin/sitemap` | Plateforme | sitemap | Embed page |
| `/admin/hidden-features` | Plateforme | hidden | Embed page |
| `/admin/flow` | Plateforme | flow | Embed page |

---

## 4. Design & UX

### Header Admin Standardisé

Chaque vue affiche un header léger avec :
- Icône + Titre de l'onglet courant
- Fil d'Ariane contextuel (Admin → IA → Helpi)
- Actions contextuelles à droite

```tsx
<AdminViewHeader 
  title="Helpi - Moteur IA"
  breadcrumb={['Admin', 'IA', 'Helpi']}
  actions={<Button>Indexer</Button>}
/>
```

### Style Warm Pastel

- Coins ultra-arrondis (rounded-xl, rounded-2xl)
- Gradients doux par onglet
- Animations Framer Motion subtiles sur les transitions

### Mode Maintenance (N6)

Visible uniquement pour superadmin, affiché en bandeau discret en haut de l'onglet Plateforme.

---

## 5. Fichiers à Créer/Modifier

### Créations

| Fichier | Description |
|---------|-------------|
| `src/components/unified/tabs/AdminHubContent.tsx` | Nouveau conteneur principal avec 6 tabs |
| `src/components/admin/AdminViewHeader.tsx` | Header standardisé avec breadcrumb |
| `src/components/admin/views/AccesView.tsx` | Vue Accès (Users, Activity, Flags) |
| `src/components/admin/views/ReseauView.tsx` | Vue Réseau (Agencies) |
| `src/components/admin/views/IAView.tsx` | Vue IA (Helpi, STATiA) |
| `src/components/admin/views/ContenuView.tsx` | Vue Contenu (6 sous-vues) |
| `src/components/admin/views/OpsView.tsx` | Vue Ops (5 sous-vues) |
| `src/components/admin/views/PlateformeView.tsx` | Vue Plateforme (4 sous-vues) |

### Modifications

| Fichier | Action |
|---------|--------|
| `src/components/unified/tabs/AdminTabContent.tsx` | Remplacer par import de `AdminHubContent` |
| `src/pages/AdminIndex.tsx` | Supprimer (remplacé par AdminHubContent) |
| `src/pages/TDRUsersPage.tsx` | ✅ Déjà corrigé (container neutre) |
| Pages admin individuelles | Retirer leurs headers internes, garder uniquement le contenu |

### Routes Admin

Les routes `/admin/*` restent fonctionnelles et redirigent vers le workspace unifié avec les bons params :

```tsx
// admin.routes.tsx - Redirections intelligentes
<Route path="/admin/helpi" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=helpi" replace />} />
```

---

## 6. Plan d'Exécution

| Étape | Description | Fichiers |
|-------|-------------|----------|
| **1** | Créer `AdminHubContent.tsx` avec 6 onglets PillTabs | 1 nouveau |
| **2** | Créer les 6 composants de vue (AccesView, etc.) | 6 nouveaux |
| **3** | Créer `AdminViewHeader.tsx` standardisé | 1 nouveau |
| **4** | Mettre à jour `AdminTabContent.tsx` pour utiliser `AdminHubContent` | 1 modif |
| **5** | Supprimer `AdminIndex.tsx` (devenu obsolète) | 1 suppression |
| **6** | Mettre à jour les redirections dans `admin.routes.tsx` | 1 modif |
| **7** | Nettoyer les headers des pages embarquées | ~15 modifs mineures |

---

## 7. Rétrocompatibilité

- ✅ Toutes les URLs existantes restent fonctionnelles via redirections
- ✅ Les pages individuelles peuvent toujours être ouvertes en standalone (AdminLayout)
- ✅ Les bookmarks et liens partagés continuent de fonctionner
- ✅ Pas de breaking change pour l'API ou les permissions

---

## Résultat Attendu

1. **Navigation directe** : Clic sur "Accès" → Table utilisateurs immédiatement visible
2. **Zéro tuile** : Plus d'écran intermédiaire avec des cartes cliquables
3. **Design cohérent** : Même style que les autres onglets du workspace (Stats, Guides)
4. **Maintenance réduite** : Un seul point d'entrée (`AdminHubContent`) au lieu de 27 pages dispersées

