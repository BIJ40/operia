

## Correctif : filtre `via_user_assignment` dans UserPermissionsColumnV2

### Problème
Le filtre actuel exclut les sections (`node_type !== 'section'`) et propose les sous-modules individuellement (ex: `ticketing.kanban`, `ticketing.liste`…). Or, la bonne logique est de proposer uniquement les modules marqués `via_user_assignment = true` dans `module_distribution_rules` — le RPC gère ensuite la cascade via `auto_section`.

### Modification unique

**Fichier** : `src/components/admin/users/user-full-dialog/UserPermissionsColumnV2.tsx` (lignes 76-81)

Remplacer :
```typescript
const available = modules.filter(
  m => m.is_deployed &&
    m.node_type !== 'section' &&
    m.min_role < 5 &&
    !granted.find(g => g.module_key === m.key)
);
```

Par :
```typescript
const available = modules.filter(
  m => m.is_deployed &&
    m.via_user_assignment === true &&
    m.min_role < 5 &&
    !granted.find(g => g.module_key === m.key)
);
```

### Résultat
- Seuls les modules configurés comme "option individuelle" (`via_user_assignment`) apparaissent dans le sélecteur "Ajouter un module"
- Actuellement : seul **Ticketing** apparaît
- Extensible : tout nouveau module marqué `via_user_assignment` dans `module_distribution_rules` apparaîtra automatiquement

Build 0 erreur attendu — le champ `via_user_assignment` est déjà présent dans `ModuleCatalogEntry` via le hook `useModuleCatalog`.

