

# Plan : Export complet DB + nouvel onglet "Database" dans Ops

## 1. Réécriture `export-all-data/index.ts`

Réécriture complète avec :
- **Auth JWT** (N5+ requis) via le même pattern que `export-full-database` (plus de secret hardcodé)
- **CORS** via `_shared/cors.ts` (`handleCorsPreflightOrReject` / `withCors`)
- **2 modes** via query params :
  - `GET` sans params → liste toutes les tables publiques avec row counts
  - `GET ?table=profiles` → export complet d'une table avec pagination interne (boucle 1000 rows, aucune limite artificielle)
- Service role client pour bypass RLS
- Pas de `rpc('exec_sql')` — on liste les tables via un hardcoded array reprenant les 6 groupes de `export-full-database` (toutes les ~100 tables connues)

## 2. Nouvelle page `AdminDatabaseExport.tsx`

Page complète avec :
- **Phase 1** : appel sans params → affiche la liste des tables avec leurs row counts dans un tableau
- **Bouton "Tout exporter"** : boucle sur chaque table, appelle `?table=xxx`, télécharge un fichier JSON par table (ou un seul fichier consolidé)
- **Bouton par table** : export individuel d'une seule table
- **Progress bar** : progression table par table (X/N)
- Composants : `Card`, `Table`, `Button`, `Progress`

## 3. Ajout onglet "Database" dans `OpsView.tsx`

- Nouveau tab `{ id: 'database', label: 'Database', icon: ServerIcon, accent: 'red' }`
- Lazy load de `AdminDatabaseExport`
- Ajout dans `DEFAULT_TAB_ORDER`
- Ajout du `TabsContent`

## 4. Config TOML

Vérifier/ajouter `[functions.export-all-data]` avec `verify_jwt = false` (validation manuelle dans le code comme `export-full-database`).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/export-all-data/index.ts` | Réécriture complète |
| `src/pages/admin/AdminDatabaseExport.tsx` | Création |
| `src/components/admin/views/OpsView.tsx` | Ajout onglet Database |
| `supabase/config.toml` | Ajout entry si manquante |

