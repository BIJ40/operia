# Rôles et Hiérarchie — Documentation Complète

> **Date** : 28 mars 2026

---

## 1. Rôles globaux (`global_role`)

| Niveau | Enum | Label FR | Contexte | Accès permissions |
|:---:|------|----------|----------|-------------------|
| N0 | `base_user` | Utilisateur de base | Hors agence | Accès minimal, pas de modules agence |
| N1 | `franchisee_user` | Utilisateur agence | Agence | Modules par délégation N2 uniquement |
| N2 | `franchisee_admin` | Dirigeant agence | Agence | Hérite plan, délègue aux N1 |
| N3 | `franchisor_user` | Utilisateur réseau | Franchiseur | Interface Franchiseur (lecture) |
| N4 | `franchisor_admin` | Admin réseau | Franchiseur | Interface Franchiseur (admin) + gestion agences |
| N5 | `platform_admin` | Admin plateforme | Plateforme | Bypass complet des modules |
| N6 | `superadmin` | Super-admin | Plateforme | Bypass complet + admin plateforme |

### Stockage

- `profiles.global_role` — rôle principal de l'utilisateur
- `profiles.role_level` — niveau numérique (0-6)
- **Jamais de rôles dans `profiles` directement** → table séparée si rôles multiples

---

## 2. Postes agence (`role_agence`)

Le poste est un **profil métier** stocké dans `profiles.role_agence`. Il ne modifie PAS le `global_role` — un commercial et un technicien sont tous les deux N1 (`franchisee_user`).

| Poste | `role_agence` | Modules par défaut (preset) |
|-------|--------------|----------------------------|
| Administratif | `administratif` | Salariés, Plannings, Docs légaux, Médiathèque, Guides, Aide |
| Commercial | `commercial` | Suivi client, Comparateur, Prospects, Réalisations, Guides, Aide |
| Technicien | `technicien` | Guides, Aide |

### Différences clés

| Aspect | `global_role` | `role_agence` |
|--------|--------------|---------------|
| Nature | Rôle système (permissions) | Poste métier (preset modules) |
| Impact sur RPC | Oui — détermine le niveau d'accès | Non — détermine les modules par défaut |
| Modifiable par | N4+ | N2+ |
| Stocké dans | `profiles.global_role` | `profiles.role_agence` |

---

## 3. Interfaces de rôle

Certaines interfaces sont accessibles par rôle, pas par module :

| Interface | Rôle minimum | Gestion |
|-----------|:-:|---|
| **Franchiseur** — Dashboard, Agences, KPI | N3 | `canAccessFranchisorInterface()` |
| **Franchiseur** — Redevances | N4 | `canAccessFranchisorSection('royalties')` |
| **Admin plateforme** | N4 | Guard dédié |

Ces interfaces sont hors du système de plans d'agence.

---

## 4. Matrice des capacités par niveau

| Capacité | N0 | N1 | N2 | N3 | N4 | N5+ |
|----------|:--:|:--:|:--:|:--:|:--:|:---:|
| Voir modules plan agence | ❌ | Par délégation | ✅ | ❌¹ | ❌¹ | ✅ (bypass) |
| Recevoir modules par délégation | ❌ | ✅ | ❌² | ❌ | ❌ | ❌ |
| Déléguer modules à N1 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Gérer options agence | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assigner modules individuels | ❌ | ❌ | Certains³ | ❌ | ✅ | ✅ |
| Interface Franchiseur | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Interface Admin | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Bypass total | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

¹ N3/N4 n'ont pas d'agence — modules agence non applicables  
² N2 ne reçoit pas par délégation — il hérite du plan  
³ Selon `assignable_by_scope = 'agency_admin'` ou `'both'`

---

## 5. Flux de délégation N2 → N1

```
┌─────────────────────────────────────────────────┐
│                  Enveloppe agence                │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │ Plan agence  │    │ Options agence actives  │ │
│  │ (STARTER/PRO)│    │ (agency_module_         │ │
│  │              │    │  entitlements)           │ │
│  └──────┬───────┘    └──────────┬─────────────┘ │
│         │                      │                 │
│         └──────────┬───────────┘                 │
│                    │                             │
│          Modules délégables                      │
│          (is_delegatable = true)                  │
│                    │                             │
│         ┌──────────▼──────────┐                  │
│         │  N2 délègue à N1   │                  │
│         │  via user_access   │                  │
│         │  source =          │                  │
│         │  'agency_delegation'│                  │
│         └─────────────────────┘                  │
└─────────────────────────────────────────────────┘
```

### Règles strictes

1. Le N2 n'a PAS besoin d'utiliser le module personnellement
2. Le module doit être dans l'enveloppe agence (plan + options)
3. Le module doit être `is_delegatable = true`
4. Un deny explicite (`granted = false`) bloque la délégation
5. Le N2 doit être de la même agence que le N1
