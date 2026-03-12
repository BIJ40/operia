# Phase 9e — Rapport d'alignement strict Vue A sur la navigation réelle

## Date : 2026-03-12

---

## 1. Pourquoi Documents était incomplet

`navigationStructure.ts` ne listait qu'une entrée **"Médiathèque"** pour le domaine Documents. Or `DocumentsTabContent.tsx` affiche **3 sous-onglets** :

| Sous-onglet | Guard runtime réel | Clé résolvée via COMPAT_MAP |
|---|---|---|
| **Médiathèque** | `mediatheque.documents` | `divers_documents` (enabled) |
| **Raccourcis** | `mediatheque.gerer` | `divers_documents.gerer` |
| **Corbeille** | `mediatheque.gerer` (visibilité) + `mediatheque.corbeille` (texte "vider") | `divers_documents.gerer` / `divers_documents.corbeille_vider` |

**Preuve runtime** (`DocumentsTabContent.tsx` lignes 17-19) :
```typescript
const canManage = hasModule('mediatheque.gerer' as any);
const canEmptyTrash = hasModule('mediatheque.corbeille' as any);
```

- `mediatheque.gerer` est une **vraie clé** déclarée dans `types/modules.ts` (ligne 62)
- `mediatheque.corbeille` est une **vraie clé** déclarée dans `types/modules.ts` (ligne 63)
- Les deux sont résolues via le COMPAT_MAP vers des clés legacy `divers_documents.*`

**Correction** : 3 entrées dans la Vue A, chacune reliée à son guard réel.

---

## 2. Pourquoi Franchiseur affichait des labels inventés

Les 4 anciennes entrées ("Dashboard réseau", "Statistiques réseau", "Gestion agences", "Comparatifs") **n'existent dans aucun composant de l'application**. Elles avaient été créées comme placeholders conceptuels.

**Onglets réels** (`FranchiseurView.tsx` lignes 71-79, constante `ALL_TABS`) :

| Onglet réel | Guard |
|---|---|
| Accueil | Role-gated : `franchisee_admin`, `platform_admin`, `superadmin` |
| Période | Role-gated : idem |
| Agences | Role-gated : idem |
| Redevances | Role-gated : idem |
| Statistiques | Role-gated : idem |
| Divers | Role-gated : idem |
| Guides | Role-gated : idem |
| Support | Role-gated : idem |

**Sous-conditions vérifiées** : Aucune. Les 8 onglets sont tous rendus inconditionnellement dans `ALL_TABS`. Il n'existe aucun guard module, feature flag, ou condition de données supplémentaire. La seule protection est au niveau du domaine entier : l'accès à `FranchiseurView` est contrôlé par le rôle global (N3+ : `franchisee_admin`, `platform_admin`, `superadmin`). Le composant est wrappé dans `FranchiseurProvider` mais celui-ci ne filtre pas les onglets.

**Correction** : 8 entrées correspondant exactement aux onglets de `ALL_TABS`.

---

## 3. Pourquoi Admin affichait des labels inventés

Les 4 anciennes entrées ("Utilisateurs", "Agences", "Droits & Modules", "FAQ Admin") étaient une simplification grossière.

**Structure réelle** (`AdminHubContent.tsx`) :

### Pill tabs principaux (lignes 46-53, `ADMIN_MAIN_TABS`) :
| Pill tab | Guard |
|---|---|
| Gestion | Role-gated : `platform_admin`, `superadmin` |
| Franchiseur | Role-gated : idem |
| IA | Role-gated : idem |
| Contenu | Role-gated : idem |
| Ops | Role-gated : idem |
| Plateforme | Role-gated : idem |

### Sous-onglets Gestion (lignes 56-64, `GESTION_SUB_TABS`) :
| Folder tab | Guard |
|---|---|
| Utilisateurs | Role-gated : idem |
| Inscriptions | Role-gated : idem |
| Apporteurs | Role-gated : idem |
| Audit Apporteurs | Role-gated : idem |
| Agences | Role-gated : idem |
| Droits | Role-gated : idem (label affiché = "Droits", id = "modules") |
| Activité | Role-gated : idem |

**Sous-conditions vérifiées** : Aucune sous-condition masquée. Tous les onglets et sous-onglets sont rendus inconditionnellement dans les constantes `ADMIN_MAIN_TABS` et `GESTION_SUB_TABS`. La seule protection est :
1. Le rôle global (N5 : `platform_admin`, `superadmin`) vérifié au niveau domaine
2. Le `MfaGuard` qui protège l'ensemble de `AdminTabContent`

Aucun guard module, feature flag, ou condition contextuelle ne filtre les onglets individuels.

**Correction** : 12 entrées (7 Gestion + 5 autres pill tabs).

---

## 4. Disparition de "Mon agence" comme faux label

### Avant
- `rightsTaxonomy.ts` : `pilotage.agence` → fallback "Mon agence", `agence` → fallback "Mon agence"
- Aucune page "Mon agence" n'existe dans l'UI

### Après
- `pilotage.agence` → fallback **"Pilotage agence"** (label métier neutre décrivant la permission)
- `agence` → fallback **"Pilotage agence"** (idem)
- "Mon agence" ajouté dans `LEGACY_LABELS` pour que l'ancien label soit automatiquement corrigé vers "Pilotage agence" par `getRightsDisplayLabel()`

---

## 5. Fichiers modifiés

| Fichier | Nature de la modification |
|---|---|
| `src/lib/navigationStructure.ts` | Domaines Documents (3 entrées), Franchiseur (8 entrées), Admin (12 entrées) alignés sur les composants réels |
| `src/components/admin/views/rightsTaxonomy.ts` | Fallback "Mon agence" → "Pilotage agence" + legacy detection |
| `dev-reports/phase9e-navigation-strict-alignment-report.md` | Ce rapport |

**Aucun autre fichier hors périmètre n'a été touché.**

---

## 6. Contraintes respectées

- ✅ Aucune modification RPC
- ✅ Aucune modification base de données
- ✅ Aucun guard runtime modifié
- ✅ Aucune clé fonctionnelle modifiée
- ✅ Pas de refactor opportuniste
- ✅ Uniquement réalignement strict labels/structure sur la navigation réelle
