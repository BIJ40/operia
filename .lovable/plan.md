

## Fix : Stabiliser l'ordre des modules dans la page Droits

### Cause

Quand on change un rôle minimum, la mutation invalide le cache React Query, ce qui re-fetch depuis Supabase avec `.order('sort_order')`. Or **9 modules racine ont `sort_order = 0`** — l'ordre retourné par PostgreSQL est donc aléatoire à chaque requête.

Le même problème existe dans `buildTree` (tri des enfants par `sort_order` sans tiebreaker).

### Correction

Ajouter un **tiebreaker alphabétique par `key`** à deux endroits :

1. **`useModuleRegistry.ts`** — requête Supabase : `.order('sort_order').order('key')`
2. **`useModuleRegistry.ts`** — `buildTree` fonction de tri : `a.sort_order - b.sort_order || a.key.localeCompare(b.key)`

Résultat : l'ordre sera toujours stable et identique, même si les `sort_order` sont égaux.

### Fichier impacté

| Fichier | Lignes |
|---------|--------|
| `src/hooks/access-rights/useModuleRegistry.ts` | ~69 (buildTree sort) et ~119 (query) |

