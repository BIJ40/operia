

## Correction : Suppression des tags `impact_*` uniquement

### Ce qui sera fait
Supprimer les 4 tags qui commencent par `impact_` de la table `apogee_ticket_tags` :

| Tag à supprimer | Date de création |
|-----------------|------------------|
| `impact_process` | 2026-02-05 17:54 |
| `impact_facturation` | 2026-02-05 17:54 |
| `impact_pilotage` | 2026-02-05 17:54 |
| `impact_terrain` | 2026-02-05 17:54 |

### Ce qui ne change PAS
- ✅ La fonctionnalité de création de tags reste active
- ✅ `ATTENTE REPONSE HC` n'est pas touché
- ✅ Tous les autres tags utilisateur sont conservés

### Requête SQL
```sql
DELETE FROM apogee_ticket_tags 
WHERE id LIKE 'impact_%';
```

### Résultat
Après exécution, il restera 10 tags dans les filtres :
`BUG`, `EVO`, `NTH`, `RÉPONDU HC`, `ATT REPONSE HC`, `MICROSOFT`, `EVOLUTION`, `URGENT`, `PROCHAIN CDC DEVIS`, `ATTENTE REPONSE HC`

