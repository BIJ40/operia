

## C1.2 — Plan global : Réorganisation Droits + Clarification nomenclature

### Tableau de nomenclature complet

Chaque nœud du `module_registry` qui apparaîtra dans la page Droits :

| Clé technique DB | Label DB actuel | Label navigation UI | Label cible Droits | Action |
|---|---|---|---|---|
| `stats` | Statistiques | Statistiques | Statistiques | Aucune |
| `stats.general` | Général | Général | Général | Aucune |
| `stats.apporteurs` | Apporteurs | Apporteurs | Apporteurs | Aucune |
| `stats.techniciens` | Techniciens | Techniciens | Techniciens | Aucune |
| `stats.univers` | Univers | Univers | Univers | Aucune |
| `stats.sav` | SAV | SAV | SAV | Aucune |
| `stats.previsionnel` | Prévisionnel | Prévisionnel | Prévisionnel | Aucune |
| `stats.exports` | Exports | *(feature, pas de pill)* | Exports | Aucune |
| `agence` | Pilotage agence | *(gate pour Performance, Actions, Devis, Incohérences)* | Pilotage agence | Relabellisé → **Mon agence** |
| `prospection` | Commercial / Prospection | *(gate pour Suivi, Comparateur, Veille, Prospects)* | Prospection | Relabellisé → **Prospection** (fallback déjà actif) |
| `realisations` | Réalisations | Réalisations | Réalisations | Aucune |
| `rh` | Ressources humaines | Salariés | Salariés | Relabellisé → **Salariés** (fallback déjà actif) |
| `divers_apporteurs` | Apporteurs | Apporteurs | Apporteurs | Aucune |
| `divers_plannings` | Plannings | Plannings | Plannings | Aucune |
| `divers_reunions` | Réunions | Réunions | Réunions | Aucune |
| `divers_documents` | Documents | Documents légaux | Documents légaux | Relabellisé via fallback (nouveau) |
| `parc` | Parc véhicules & EPI | Parc | Parc | Relabellisé → **Parc** (fallback déjà actif) |
| `documents` | Documents | Médiathèque | Documents | Aucune (label OK) |
| `documents.consulter` | Consulter | — | Consulter | Aucune |
| `documents.gerer` | Gérer | — | Gérer | Aucune |
| `documents.corbeille_vider` | Vider corbeille | — | Vider corbeille | Aucune |
| `aide` | Aide | Aide en ligne | Aide en ligne | Relabellisé via fallback (nouveau) |
| `guides` | Guides | Guides | Guides | Aucune |
| `ticketing` | Ticketing | Ticketing | Ticketing | Aucune |
| `admin_plateforme` | Administration | Admin | Admin | Relabellisé → **Admin** (fallback déjà actif) |
| `reseau_franchiseur` | Réseau Franchiseur | Franchiseur | Franchiseur | Relabellisé via fallback (nouveau) |

**Classification des actions :**
- **Seulement reclassé** (déplacé dans une autre catégorie) : `agence` (de sa propre catégorie → Pilotage), `reseau_franchiseur` (de catégorie Franchiseur → Admin)
- **Seulement relabellisé** (fallback cosmétique, clé DB inchangée) : `divers_documents`, `aide`, `reseau_franchiseur`
- **Reclassé + relabellisé** : `agence` (reclassé sous Pilotage + fallback "Mon agence")
- **Aucun renommage structurel** : Aucune clé DB n'est renommée dans cette passe. Tout est cosmétique via `NAVIGATION_LABEL_FALLBACKS`.

### Nœuds legacy (isolés en zone séparée)

| Nœud | Raison |
|---|---|
| `outils` | Nœud structurel sans équivalent navigation — enfants non utilisés en runtime |
| `outils.actions` | Orphelin — pill "Actions à mener" gatée par `agence` |
| `outils.apporteurs` | Doublon de `divers_apporteurs` |
| `outils.apporteurs.consulter` | Doublon |
| `outils.apporteurs.gerer` | Doublon |
| `outils.administratif` | Doublon structurel |
| `outils.administratif.plannings` | Doublon de `divers_plannings` |
| `outils.administratif.reunions` | Doublon de `divers_reunions` |
| `outils.administratif.documents` | Doublon de `divers_documents` |
| `outils.parc` | Doublon de `parc` |
| `outils.parc.vehicules` | Doublon |
| `outils.parc.epi` | Doublon |
| `outils.parc.equipements` | Doublon |
| `outils.performance` | Orphelin — pill "Performance" gatée par `agence` |
| `outils.commercial` | Orphelin — pill "Commercial" gatée par `prospection` |
| `salaries` | Existe dans moduleTree uniquement, pas dans `MODULES` runtime — `rh` est la vraie clé |

### Éléments UI non couverts par un nœud dédié

| Élément UI | Gate actuel | Nœud dédié | Constat |
|---|---|---|---|
| Performance, Actions, Devis, Incohérences | `agence` | NON | 4 pills, 1 seul nœud |
| Suivi, Comparateur, Veille, Prospects | `prospection` options | NON | Options du module, pas nœuds registry |
| FAQ | Aucun gate | NON | Toujours visible |
| Admin > Gestion, IA, Contenu, Ops, Plateforme | Rôle N4+ | NON | Contrôle par rôle, pas module |
| Accueil | Aucun gate | NON | Dashboard toujours visible |

---

### Plan d'exécution — 2 fichiers

#### Fichier 1 : `src/components/admin/views/rightsTaxonomy.ts`

**Type union** : retirer `'franchiseur'`, garder 6 catégories (pas d'`accueil` — rien à contrôler).

**`RIGHTS_CATEGORIES`** :
```typescript
[
  { id: 'pilotage',     label: 'Pilotage',      moduleKeys: ['stats', 'agence'] },
  { id: 'commercial',   label: 'Commercial',    moduleKeys: ['prospection', 'realisations'] },
  { id: 'organisation', label: 'Organisation',  moduleKeys: ['rh', 'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'parc', 'divers_documents'] },
  { id: 'documents',    label: 'Documents',     moduleKeys: ['documents'] },
  { id: 'support',      label: 'Support',       moduleKeys: ['aide', 'guides', 'ticketing'] },
  { id: 'admin',        label: 'Admin',         moduleKeys: ['admin_plateforme', 'reseau_franchiseur'] },
]
```

**`NAVIGATION_LABEL_FALLBACKS`** — ajouter :
- `agence` → `'Mon agence'`
- `divers_documents` → `'Documents légaux'`
- `divers_apporteurs` → `'Apporteurs'`
- `divers_plannings` → `'Plannings'`
- `divers_reunions` → `'Réunions'`
- `aide` → `'Aide en ligne'`
- `reseau_franchiseur` → `'Franchiseur'`

**`LEGACY_LABELS`** — ajouter :
- `agence` → `['Pilotage agence']`
- `reseau_franchiseur` → `['Réseau Franchiseur']`
- `aide` → `['Aide']`

**Nouvelle fonction exportée** `nodeMatchesCategory` :
```typescript
export function nodeMatchesCategory(nodeKey: string, moduleKeys: string[]): boolean {
  return moduleKeys.some(mk => nodeKey === mk || nodeKey.startsWith(mk + '.'));
}
```

**`RIGHTS_CATEGORY_ROOT_KEYS`** : recalculé automatiquement (pas de changement de logique).

#### Fichier 2 : `src/components/admin/views/ModulesMasterView.tsx`

**L676** : remplacer `category.moduleKeys.includes(node.key.split('.')[0])` par `nodeMatchesCategory(node.key, category.moduleKeys)`.

**L683** : même remplacement inversé — les nœuds `outils.*` et `salaries.*` tomberont automatiquement en legacy car aucun `moduleKeys` ne les matche.

**Import** : ajouter `nodeMatchesCategory` à l'import L26.

---

### Ce qui ne change PAS

- Aucune clé DB renommée
- Aucun droit modifié
- Aucun override touché
- Aucun plan modifié
- Aucun `min_role` modifié
- `scopeRegistry.ts` inchangé
- Compat maps inchangées

