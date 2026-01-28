

# Plan de Correction : Labels Admin Définitifs

## Analyse des Écarts

### ✅ Onglets Niveau 1 - CONFORMES
Les 6 onglets principaux sont corrects : Accès, Réseau, IA, Contenu, Ops, Plateforme

### ❌ Sous-onglets Niveau 2 - ÉCARTS DÉTECTÉS

| Vue | Actuel | Attendu | Action |
|-----|--------|---------|--------|
| **Accès** | Utilisateurs, Activité, **Feature Flags** | Utilisateurs, Activité | ❌ Supprimer "Feature Flags" → déplacer vers Plateforme/Modules |
| **Ops** | Backups, **HC Backup**, Cache, **Rapport Apogée**, **Stockage** | Backups, **Imports**, Cache, **Reports**, **Quota** | ❌ Renommer 3 labels |
| **Contenu** | Guides, FAQ, Templates, Annonces, Notifications, **Métadonnées** | Guides, FAQ, Templates, **Metadata**, Annonces, Notifications | ❌ Renommer "Métadonnées" → "Metadata" |
| **Plateforme** | Santé, Sitemap, **Masqué**, Flow | Santé, **Modules**, **Laboratoire**, Sitemap, Flow | ❌ Ajouter "Modules" (Feature Flags), renommer "Masqué" → "Laboratoire", réordonner |

---

## Modifications à Effectuer

### 1. AccesView.tsx - Supprimer Feature Flags
**Fichier** : `src/components/admin/views/AccesView.tsx`

```text
AVANT:
SUB_TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'activity', label: 'Activité', icon: Activity },
  { id: 'flags', label: 'Feature Flags', icon: ToggleRight },  ← SUPPRIMER
]

APRÈS:
SUB_TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'activity', label: 'Activité', icon: Activity },
]
```
- Retirer l'import `AdminFeatureFlags` et `ToggleRight`
- Supprimer le `TabsContent value="flags"`

---

### 2. PlateformeView.tsx - Ajouter Modules + Renommer Laboratoire
**Fichier** : `src/components/admin/views/PlateformeView.tsx`

```text
AVANT:
SUB_TABS = [
  { id: 'health', label: 'Santé', icon: Activity },
  { id: 'sitemap', label: 'Sitemap', icon: Map },
  { id: 'hidden', label: 'Masqué', icon: EyeOff },
  { id: 'flow', label: 'Flow', icon: GitBranch },
]

APRÈS:
SUB_TABS = [
  { id: 'health', label: 'Santé', icon: Activity },
  { id: 'modules', label: 'Modules', icon: ToggleRight },      ← NOUVEAU
  { id: 'lab', label: 'Laboratoire', icon: FlaskConical },     ← RENOMMÉ
  { id: 'sitemap', label: 'Sitemap', icon: Map },
  { id: 'flow', label: 'Flow', icon: GitBranch },
]
```
- Ajouter import `AdminFeatureFlags`, `ToggleRight`, `FlaskConical`
- Ajouter `TabsContent value="modules"` avec `AdminFeatureFlags`
- Renommer id `hidden` → `lab` et label `Masqué` → `Laboratoire`

---

### 3. OpsView.tsx - Renommer les labels
**Fichier** : `src/components/admin/views/OpsView.tsx`

```text
AVANT:
SUB_TABS = [
  { id: 'backup', label: 'Backups', icon: Database },
  { id: 'hc-backup', label: 'HC Backup', icon: FileStack },
  { id: 'cache', label: 'Cache', icon: Archive },
  { id: 'report', label: 'Rapport Apogée', icon: FileJson },
  { id: 'storage', label: 'Stockage', icon: HardDrive },
]

APRÈS:
SUB_TABS = [
  { id: 'backup', label: 'Backups', icon: Database },
  { id: 'imports', label: 'Imports', icon: FileStack },        ← RENOMMÉ
  { id: 'cache', label: 'Cache', icon: Archive },
  { id: 'report', label: 'Reports', icon: FileJson },          ← RENOMMÉ
  { id: 'quota', label: 'Quota', icon: HardDrive },            ← RENOMMÉ
]
```

---

### 4. ContenuView.tsx - Renommer + Réordonner
**Fichier** : `src/components/admin/views/ContenuView.tsx`

```text
AVANT:
SUB_TABS = [
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'templates', label: 'Templates', icon: FileEdit },
  { id: 'annonces', label: 'Annonces', icon: Megaphone },
  { id: 'notifs', label: 'Notifications', icon: Bell },
  { id: 'metadata', label: 'Métadonnées', icon: FileText },
]

APRÈS:
SUB_TABS = [
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'templates', label: 'Templates', icon: FileEdit },
  { id: 'metadata', label: 'Metadata', icon: FileText },       ← RENOMMÉ + POSITION
  { id: 'annonces', label: 'Annonces', icon: Megaphone },
  { id: 'notifs', label: 'Notifications', icon: Bell },
]
```

---

### 5. admin.routes.tsx - Mettre à jour les redirections
**Fichier** : `src/routes/admin.routes.tsx`

Corrections nécessaires :
- `/admin/feature-flags` → `plateforme/modules` (plus `acces/flags`)
- `/admin/modules` → `plateforme/modules`
- `/admin/helpconfort-backup` → `ops/imports` (plus `hc-backup`)
- `/admin/storage-quota` → `ops/quota` (plus `storage`)
- `/admin/hidden-features` → `plateforme/lab` (plus `hidden`)

---

## Récapitulatif Labels Finaux

### Accès (2 sous-onglets)
| ID | Label |
|----|-------|
| users | Utilisateurs |
| activity | Activité |

### Réseau (1 sous-onglet)
| ID | Label |
|----|-------|
| agencies | Agences |

### IA (3 sous-onglets)
| ID | Label |
|----|-------|
| helpi | Helpi |
| statia | StatIA |
| validator | Validator |

### Contenu (6 sous-onglets)
| ID | Label |
|----|-------|
| guides | Guides |
| faq | FAQ |
| templates | Templates |
| metadata | Metadata |
| annonces | Annonces |
| notifs | Notifications |

### Ops (5 sous-onglets)
| ID | Label |
|----|-------|
| backup | Backups |
| imports | Imports |
| cache | Cache |
| report | Reports |
| quota | Quota |

### Plateforme (5 sous-onglets)
| ID | Label |
|----|-------|
| health | Santé |
| modules | Modules |
| lab | Laboratoire |
| sitemap | Sitemap |
| flow | Flow |

---

## Fichiers à Modifier

| Fichier | Actions |
|---------|---------|
| `AccesView.tsx` | Supprimer flags (2 tabs restants) |
| `PlateformeView.tsx` | Ajouter Modules, renommer Laboratoire (5 tabs) |
| `OpsView.tsx` | Renommer 3 labels |
| `ContenuView.tsx` | Renommer Metadata, réordonner |
| `admin.routes.tsx` | Corriger 5 redirections |

