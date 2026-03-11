

## C1 — Uniformisation nomenclature : Plan d'implémentation

### Résumé des corrections

6 fichiers à modifier, 0 suppression, 0 changement de logique d'accès.

---

### 1. `src/contexts/AuthContext.tsx` (L393-411)

**Problème** : `hasModuleGuard('apporteurs')`, `hasModuleGuard('helpconfort')`, `hasModuleGuard('guide_apogee')` pointent vers des `ModuleKey` inexistantes → accès toujours refusé sauf admin.

**Correction** : Utiliser le module parent `guides` + l'option spécifique via `hasModuleOptionGuard` (déjà disponible L116-118) :

```typescript
case 'apporteurs':
  return hasModuleOptionGuard('guides', 'apporteurs');
case 'helpconfort':
  return hasModuleOptionGuard('guides', 'helpconfort');
case 'apogee':
  return hasModuleOptionGuard('guides', 'apogee');
case 'mes_indicateurs':
  return hasModuleGuard('agence');
```

Cela vérifie `guides` activé **ET** l'option spécifique activée — pas d'élargissement involontaire.

Ajouter `hasModuleOptionGuard` aux dépendances du `useCallback`.

---

### 2. `src/config/roleMatrix.ts` (L458-499)

**Problème** : `hasModuleActivated('help_academy')` et `hasModuleActivated('pilotage_agence')` — clés legacy inexistantes dans `MODULES`.

**Statut** : Code mort (`canAccessFeature` n'est importé nulle part en runtime). Correction quand même pour cohérence :

- `'help_academy'` → `'guides'` (3 occurrences L463, 468, 473)
- `'pilotage_agence'` → `'agence'` (5 occurrences L479, 484, 489, 494, 499)

---

### 3. `src/config/dashboardTiles.ts` (L10, L39-324)

**Problème** : Importe `SCOPE_SLUGS` de `scopeRegistry.ts` pour le champ `scopeSlug`. Ce champ est lu par `AuthenticatedGrid.tsx` pour déterminer les scopes.

**Correction** : Remplacer `SCOPE_SLUGS.X` par les strings canoniques en dur. L'import de `scopeRegistry` est supprimé de ce fichier.

Mapping appliqué :
| Ancien | Nouveau |
|--------|---------|
| `SCOPE_SLUGS.APOGEE` | `'apogee'` |
| `SCOPE_SLUGS.APPORTEURS` | `'apporteurs'` |
| `SCOPE_SLUGS.BASE_DOCUMENTAIRE` | `'helpconfort'` |
| `SCOPE_SLUGS.MES_INDICATEURS` | `'mes_indicateurs'` |
| `SCOPE_SLUGS.ACTIONS_A_MENER` | `'actions_a_mener'` |
| etc. | (valeurs identiques aux strings actuelles) |

Note : les valeurs string restent les mêmes — c'est juste le découplage de `scopeRegistry.ts`. Le champ `scopeSlug` lui-même reste inchangé car consommé par `AuthenticatedGrid`.

---

### 4. `src/config/docsData.ts` (L44-80)

**Problème** : `id: 'help_academy'`, `id: 'pilotage_agence'`, `id: 'support'`, `id: 'apogee_tickets'` — noms legacy dans la documentation technique.

**Correction** : Renommer vers les clés canoniques :
- `help_academy` → `guides`
- `pilotage_agence` → `agence`
- `support` → `aide`
- `apogee_tickets` → `ticketing`

Fichier purement informatif (aucun impact sur les permissions).

---

### 5. `supabase/functions/unified-search/index.ts` (L925-928)

**Problème** : Double vérification `['guides', 'help_academy']` dans la requête `user_modules`.

**Correction** : Garder les deux dans la requête `.in()` (car des données legacy peuvent exister en base avec `help_academy`), mais ajouter un commentaire `// legacy compat — à supprimer après migration DB`. Aucun changement fonctionnel.

---

### 6. `src/config/scopeRegistry.ts`

**Aucune modification**. Le fichier reste en place. Ses dépendants directs (`dashboardTiles.ts`) seront découplés. La suppression sera confirmée dans un second temps après vérification qu'aucun import résiduel ne subsiste.

---

### Fichiers NON modifiés (conservés tels quels)

| Fichier | Raison |
|---------|--------|
| `src/config/scopeRegistry.ts` | Pas de suppression dans cette passe |
| `src/permissions/shared-constants.ts` | `SHARED_MODULE_COMPAT_MAP` conservé (données legacy en DB) |
| `supabase/functions/_shared/permissionsEngine.ts` | `MODULE_COMPAT_MAP` conservé (même raison) |
| `src/config/changelog.ts` | Texte historique, pas de renommage rétroactif |

### Risques

Aucun changement de logique d'accès. Les corrections transforment des accès **cassés** (toujours refusés) en accès **fonctionnels** (vérification du bon module + option). Les admins N5+ ne sont pas impactés (bypass existant).

