

## Suppression des tags `impact_xxxxx`

### Constat
Les tags `impact_process`, `impact_facturation`, `impact_pilotage`, `impact_terrain` existent :
1. Dans la table `apogee_ticket_tags` (créés le 2026-02-05, `created_by: null`)
2. Dans le champ `impact_tags` de certains tickets (array contenant ces valeurs mélangées avec BUG, EVO, etc.)

Il y a aussi `IMPACT_FACTURATION` (créé aujourd'hui par un utilisateur qui l'a re-saisi via le TagSelector).

### Plan

**Étape 1 — Nettoyage des données (outil insert/update)**

```sql
-- Supprimer les tags impact_xxx de la table apogee_ticket_tags
DELETE FROM apogee_ticket_tags WHERE id IN ('impact_process', 'impact_facturation', 'impact_pilotage', 'impact_terrain', 'IMPACT_FACTURATION');

-- Retirer ces valeurs du champ impact_tags sur tous les tickets concernés
UPDATE apogee_tickets
SET impact_tags = array_remove(array_remove(array_remove(array_remove(array_remove(
  impact_tags, 'impact_process'), 'impact_facturation'), 'impact_pilotage'), 'impact_terrain'), 'IMPACT_FACTURATION')
WHERE impact_tags && ARRAY['impact_process', 'impact_facturation', 'impact_pilotage', 'impact_terrain', 'IMPACT_FACTURATION'];
```

**Étape 2 — Garde-fou dans le code** (`TagSelector.tsx`)

Ajouter un filtre pour ignorer les tags commençant par `impact_` (minuscule) dans `selectedTags` avant affichage, empêchant toute future pollution si des données legacy réapparaissent.

### Fichiers modifiés
- `src/apogee-tickets/components/TagSelector.tsx` (filtre de sécurité)
- Données nettoyées via requêtes SQL directes

