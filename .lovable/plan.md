

# Plan : Synchroniser la liste des tables avec la base réelle

## Problème

L'edge function `export-all-data` utilise un tableau `ALL_TABLES` hardcodé de ~73 noms. La base de données contient en réalité ~132 tables publiques. Toutes les tables ajoutées après la création initiale de la liste sont manquantes.

## Solution

Remplacer la liste hardcodée par une **requête dynamique** qui interroge `information_schema.tables` pour récupérer automatiquement toutes les tables du schéma `public`. Ainsi, chaque nouvelle table sera automatiquement incluse sans modifier le code.

## Changement

**`supabase/functions/export-all-data/index.ts`** :

- Supprimer le tableau `ALL_TABLES` hardcodé
- Dans le mode "liste des tables", exécuter via le service client :
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  ```
- Stocker le résultat dynamiquement pour les validations (`countOnly`, `table=xxx`)
- Conserver la liste `HEAVY_TABLES` hardcodée (elle ne concerne que la taille de page, pas l'inventaire)

## Impact

| Fichier | Action |
|---|---|
| `supabase/functions/export-all-data/index.ts` | Remplacer ALL_TABLES par requête dynamique |

Aucun changement frontend nécessaire — la page affiche déjà ce que l'API retourne.

