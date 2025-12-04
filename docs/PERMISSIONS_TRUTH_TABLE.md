# TABLE DE VÉRITÉ - PERMISSIONS PAR RÔLE

## Hiérarchie des Rôles Globaux

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Utilisateur de base |
| N1 | `franchisee_user` | Collaborateur agence |
| N2 | `agency_admin` | Dirigeant agence |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur réseau |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Super administrateur |

---

## Accès aux Sections Principales

| Section | N0 | N1 | N2 | N3 | N4 | N5 | N6 |
|---------|----|----|----|----|----|----|-----|
| Help Academy | ✅* | ✅* | ✅* | ✅* | ✅* | ✅ | ✅ |
| Pilotage Agence | ✅* | ✅* | ✅* | ❌ | ❌ | ✅ | ✅ |
| Support (créer tickets) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Console Support | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gestion de Projet | ✅* | ✅* | ✅* | ✅* | ✅* | ✅ | ✅ |
| Espace Franchiseur | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Administration | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |

**Légende:**
- ✅ = Accès autorisé
- ✅* = Accès conditionnel (module doit être activé)
- ⚠️ = Accès partiel (voir détail)
- ❌ = Accès refusé

---

## Détail Administration (N3-N4)

| Tile Admin | N3 | N4 | N5 | N6 |
|------------|----|----|----|----|
| Gestion Utilisateurs | ✅ | ✅ | ✅ | ✅ |
| Annonces Prioritaires | ❌ | ❌ | ✅ | ✅ |
| Santé Système | ❌ | ❌ | ✅ | ✅ |
| Tickets Apogée Admin | ❌ | ❌ | ✅ | ✅ |
| Autres Admin | ❌ | ❌ | ✅ | ✅ |

---

## Modules et Options

### Module `support`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Peut créer des tickets support | N0 |
| `options.agent` | Accès console support (SA1/SA2/SA3) | N5 |

### Module `apogee_tickets`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Accès section Gestion de Projet | N0 |
| `options.kanban` | Voir Kanban + créer tickets | N0 |
| `options.manage` | Modifier tickets existants | N0 |
| `options.import` | Importer tickets en masse | N0 |

### Module `help_academy`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Accès guides Apogée/Apporteurs/HC | N0 |

### Module `pilotage_agence`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Accès indicateurs agence | N0 |

### Module `reseau_franchiseur`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Accès espace franchiseur | N3 |

### Module `rh`

| Option | Description | Rôle Min |
|--------|-------------|----------|
| `enabled` | Module RH activé | N0 |
| `options.coffre` | Coffre-fort personnel | N0 |
| `options.rh_viewer` | Gestion équipe (sans salaires) | N2 |
| `options.rh_admin` | Administration RH complète | N2 |

---

## Gestion Utilisateurs - Portée

| Rôle Éditeur | Peut voir/modifier | Agences accessibles |
|--------------|-------------------|---------------------|
| N2 | N0-N1 | Sa propre agence |
| N3 | N0-N2 | Agences assignées |
| N4 | N0-N3 | Toutes (ou assignées si scope limité) |
| N5 | N0-N4 | Toutes |
| N6 | N0-N5 | Toutes |

---

## Règles de Sécurité

1. **DENY toujours prioritaire** - Une interdiction explicite bloque tout accès
2. **Plafond par rôle système** - Un module ne peut pas dépasser le `minRole` défini
3. **N6 absolu** - Superadmin a accès inconditionnel à tout
4. **Module requis** - L'activation du module est vérifiée avant l'accès aux options
5. **Console Support stricte** - N5+ uniquement, pas de bypass via module option

---

*Dernière mise à jour : 2025-12-04*
