# Phase 9f — Rapport de correction visibilité Franchiseur

**Date** : 2026-03-12
**Statut** : ✅ CORRIGÉ

---

## Bug constaté

Le domaine **Franchiseur** (Vue A — fiche utilisateur) était visible pour les profils `franchisee_admin` (N2), alors que le runtime réel (`AuthContext.tsx`) exige un niveau ≥ N3 (`franchisor_user`).

Conséquence : un dirigeant agence comme Ronan Bouza (N2) voyait un accès fictif au domaine Franchiseur dans sa fiche utilisateur.

## Cause racine

Dans `src/lib/navigationStructure.ts`, la constante `FRANCHISEUR_ROLES` contenait `franchisee_admin` (N2) au lieu des rôles franchiseur réels (N3+) :

```typescript
// AVANT (FAUX)
export const FRANCHISEUR_ROLES: GlobalRole[] = ['platform_admin', 'superadmin', 'franchisee_admin'];
```

De plus, le label du domaine était `'Réseau'` au lieu de `'Franchiseur'`, en décalage avec le vocabulaire utilisé dans la navigation, les droits et l'admin.

## Correction appliquée

### Fichier modifié : `src/lib/navigationStructure.ts`

1. **Ligne 49** — `FRANCHISEUR_ROLES` corrigé :
```typescript
export const FRANCHISEUR_ROLES: GlobalRole[] = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'];
```

2. **Ligne 117** — Label confirmé `'Franchiseur'` (déjà corrigé en 9e).

## Profils vérifiés

| Rôle | Niveau | Voit Franchiseur ? | Attendu |
|------|--------|-------------------|---------|
| `base_user` | N0 | ❌ NON | ✅ |
| `franchisee_user` | N1 | ❌ NON | ✅ |
| `franchisee_admin` | N2 | ❌ NON | ✅ |
| `franchisor_user` | N3 | ✅ OUI | ✅ |
| `franchisor_admin` | N4 | ✅ OUI | ✅ |
| `platform_admin` | N5 | ✅ OUI | ✅ |
| `superadmin` | N6 | ✅ OUI | ✅ |

## Fichiers hors périmètre

Aucun autre fichier n'a été modifié. Pas de modification RPC, base de données, guards runtime, permissions engine, ni d'autres domaines de navigation.

## Statut

✅ Bug corrigé — `franchisee_admin` ne voit plus le domaine Franchiseur.
