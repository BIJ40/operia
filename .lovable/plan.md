

# Ajout des modules manquants dans plan_tier_modules — CORRIGÉ

## Rappel
Le ticketing est **opt-in individuel** (user_modules uniquement). Il ne doit **jamais** être dans plan_tier_modules.

## Modules à ajouter

### STARTER + PRO (enabled: true)

| Module | Justification |
|--------|--------------|
| `accueil` | Parent navigation, N0 |
| `commercial` | Parent navigation, enfants déjà configurés |
| `organisation` | Parent navigation, enfants déjà configurés |
| `pilotage` | Parent navigation, enfants déjà configurés |
| `mediatheque` | Parent navigation, enfants déjà configurés |
| `support` | Parent navigation, N0 |
| `support.faq` | FAQ publique, N0 — fonctionnalité de base manquante |
| `mediatheque.consulter` | Lecture médiathèque, N2 — fonctionnalité attendue |

### PRO uniquement (enabled: true)

| Module | Justification |
|--------|--------------|
| `pilotage.statistiques.exports` | Export stats, N2 — cohérent avec pilotage.statistiques déjà PRO |

## Modules exclus (ne PAS toucher)

- **ticketing.\*** — opt-in individuel, accès par user_modules uniquement
- **admin.\*** — bypass N5+, pas de plan
- **reseau_franchiseur.\*** — accès par rôle N3+, pas de plan
- **Non déployés** — invisibles

## Impact
- Normalise les parents de navigation (aucun changement d'accès effectif)
- Restaure FAQ, consultation médiathèque, exports stats pour les agences éligibles
- Ne touche à rien côté ticketing

## Implémentation
Une seule requête INSERT dans plan_tier_modules via l'outil d'insertion SQL (pas de migration, c'est du data).

