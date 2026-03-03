

# Plan : Export 168/168 tables sans WORKER_LIMIT

## Probleme identifie

Le retry adaptatif du frontend est **inefficace** : il envoie pageSize 100 → 50 → 25 → 10 → 5 → 1, mais le backend clamp deja les ULTRA_HEAVY tables a 10. Donc les 4 premieres tentatives utilisent toutes pageSize=10 cote serveur et crashent identiquement. Seules les tentatives a 5 et 1 changent reellement la taille, mais pour des tables comme `knowledge_base` (gros JSONB avec embeddings), meme 10 lignes depasse la limite memoire.

Le resultat : les tables lourdes echouent toutes en boucle, et le frontend enregistre `[]` pour chacune. 168 - ~66 tables echouees = ~102 reussies.

## Solution en 2 fichiers

### A. Backend : `supabase/functions/export-all-data/index.ts`

1. **Reduire les limites des tables a gros JSONB** :
   - Nouvelle categorie EXTREME : `knowledge_base`, `guide_chunks`, `rag_index_documents` → maxPageSize = **3**
   - ULTRA_HEAVY (`blocks`, `apporteur_blocks`, `chatbot_queries`) → 10
   - HEAVY → 25, standard → 100

2. **Retourner `maxPageSize` dans la reponse liste** pour que le frontend connaisse le plafond :
   ```json
   { "tables": [{ "name": "knowledge_base", "maxPageSize": 3 }, ...] }
   ```

3. **Ajouter un delai de securite** : si une requete prend trop de memoire, renvoyer une erreur 507 au lieu de laisser le runtime crasher (impossible a garantir, mais le clampage plus agressif suffit).

### B. Frontend : `src/pages/admin/AdminDatabaseExport.tsx`

1. **Stocker le `maxPageSize` par table** dans le state (retourne par le backend).

2. **Demarrer le retry ladder au plafond de la table**, pas a 100 :
   - Si `maxPageSize = 3` → ladder = [3, 1]
   - Si `maxPageSize = 25` → ladder = [25, 10, 5, 1]
   - Si `maxPageSize = 100` → ladder = [100, 50, 25, 10, 5, 1]

3. **Ajouter un delai de 300ms entre chaque table** pour eviter de saturer les workers edge.

4. **Garder le comportement actuel** : tables echouees → `[]` + recapitulatif final.

## Impact

| Fichier | Changement |
|---|---|
| `supabase/functions/export-all-data/index.ts` | Tier EXTREME (3), retourner maxPageSize |
| `src/pages/admin/AdminDatabaseExport.tsx` | Ladder dynamique, delai inter-table |

Aucune migration DB necessaire.

