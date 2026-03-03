
Objectif: exporter 168/168 tables (y compris vides) sans blocage WORKER_LIMIT.

1) Constat confirmé
- La base contient bien 168 tables publiques (`pg_tables`) et `list_public_tables()` renvoie aussi 168.
- Le “102” vient des échecs d’export table par table (pas de la découverte des tables).
- Cause principale observée: pagination trop agressive sur certaines tables volumineuses (ex. `knowledge_base`) + liste “heavy” incohérente entre frontend et fonction backend.

2) Correctifs à implémenter

A. `src/pages/admin/AdminDatabaseExport.tsx`
- Remplacer la logique “taille fixe” par une pagination adaptative:
  - tentative pageSize: 100 → 50 → 25 → 10 → 5 → 1 en cas de `WORKER_LIMIT`/546.
  - relancer la même page avec la taille inférieure jusqu’à succès ou échec final.
- Synchroniser la liste des tables lourdes avec le backend (inclure au minimum `knowledge_base`, `apogee_guides`, `apogee_tickets`, `activity_log`, et idéalement `formation_content`).
- Ne jamais exclure une table de l’export à cause d’un count incertain:
  - exporter à partir de la liste brute des tables,
  - `count === 0` => `[]` direct,
  - `count === -1` => tenter quand même l’export.
- Réduire le bruit UI:
  - éviter 1 toast d’erreur par table,
  - produire un récapitulatif final (succès/échecs + noms des tables échouées).

B. `supabase/functions/export-all-data/index.ts`
- Durcir la pagination côté backend:
  - passer d’une logique binaire `HEAVY_TABLES` à une map `TABLE_PAGE_LIMITS` (ex: ultra-lourdes=10/25, standard=100),
  - ignorer les `pageSize` trop élevés en les clampant strictement.
- Alléger le mode `countOnly`:
  - utiliser `count: 'estimated'` (ou `planned`) pour éviter les scans coûteux,
  - conserver le fallback `-1` mais sans bloquer l’export global.

3) Validation end-to-end (obligatoire)
- Recharger la liste: vérifier affichage de 168 tables.
- Lancer “Tout exporter” en JSON:
  - vérifier absence d’arrêt prématuré,
  - vérifier résumé final proche de 168/168.
- Vérifier que les tables vides sont présentes dans le fichier avec `[]`.
- Tester explicitement des tables lourdes (`knowledge_base`, `blocks`, `formation_content`) en export unitaire.

Section technique (résumé)
- Problème = capacité compute par requête, pas inventaire des tables.
- Fix = stratégie de “graceful degradation” (réduction automatique du pageSize) + alignement frontend/backend + counts non bloquants.
- Aucun changement de schéma base requis; uniquement logique d’export (frontend + fonction backend).
