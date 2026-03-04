

## Problème

1. **`CreateProjectTicketDialog.tsx`** (ligne 176) : `reported_by` est hardcodé à `'agence'` au lieu d'utiliser le prénom de l'utilisateur connecté
2. **`OrigineBadge.tsx`** : `AGENCE` et `AUTRE` sont encore dans la config connue — ils ne devraient plus exister comme origines valides. Le badge doit toujours afficher soit un **prénom** (icône User), soit un **email** (icône Mail)

## Corrections

### A. `CreateProjectTicketDialog.tsx` — Utiliser le prénom au lieu de "agence"

Le profil utilisateur est déjà chargé (ligne 155-159). Remplacer :
```
reported_by: 'agence'
```
par :
```
reported_by: profile?.first_name?.toUpperCase() || user.email || 'INCONNU'
```

### B. `OrigineBadge.tsx` — Supprimer AGENCE/AUTRE de la config

- Retirer `AGENCE` et `AUTRE` de `ORIGINE_CONFIG` pour qu'ils ne soient plus traités comme des origines connues
- Toute valeur non email et non dans la liste des prénoms connus passera dans la branche "nom dynamique" → affichera le prénom formaté avec couleur générée
- Les emails continueront d'afficher avec l'icône Mail

### C. Migration des données existantes

Mettre à jour les tickets existants qui ont `reported_by = 'agence'` ou `'AGENCE'` pour les remplacer par le prénom de l'utilisateur qui les a créés (via `created_by_user_id` → `profiles.first_name`). Requête SQL :

```sql
UPDATE apogee_tickets t
SET reported_by = UPPER(p.first_name)
FROM profiles p
WHERE t.created_by_user_id = p.id
  AND UPPER(t.reported_by) IN ('AGENCE', 'AUTRE')
  AND p.first_name IS NOT NULL;
```

