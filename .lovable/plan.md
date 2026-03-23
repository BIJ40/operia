

# Ajouter les dossiers "À planifier travaux" et "À commander" dans Actions à mener

## Objectif
Afficher deux nouvelles sections dans l'onglet "Actions à mener" :
1. **Les 10 dossiers "À planifier travaux"** (state `to_planify_tvx`) les plus anciens (basé sur la date de passage à cet état dans l'historique)
2. **Les 10 dossiers "À commander"** (state `devis_to_order`) les plus anciens (idem)

## Plan de modification

### 1. Étendre les types (`src/apogee-connect/types/actions.ts`)
- Ajouter `'a_planifier_tvx' | 'a_commander'` au type `ActionType`
- Ajouter les labels correspondants dans `ACTION_LABELS`
- Ajouter les délais dans `ActionsConfig` et `DEFAULT_CONFIG` (ex: 7 jours par défaut)

### 2. Ajouter la logique de détection (`src/apogee-connect/utils/actionsAMenerCalculations.ts`)
- Ajouter deux nouvelles règles dans `buildActionsAMener` :
  - **Règle 4** : Projets avec `state === 'to_planify_tvx'` — chercher dans l'historique (`kind === 2`) le passage `=> À planifier` pour obtenir la `dateDepart`, trier par ancienneté, garder les 10 plus anciens
  - **Règle 5** : Projets avec `state === 'devis_to_order'` — chercher `=> À commander` dans l'historique, même logique, 10 plus anciens
- Fallback si pas d'historique : utiliser `project.updated_at` ou `project.created_at`
- Ces actions ne sont pas filtrées par deadline (toujours affichées), triées par ancienneté décroissante

### 3. Ajouter les filtres dans le composant (`src/components/pilotage/ActionsAMenerTab.tsx`)
- Ajouter deux nouveaux boutons-filtres pills pour "À planifier" et "À commander"
- Couleurs : bleu ciel pour planifier, orange pour commander (cohérent avec le reste de l'app)
- Étendre le type `FilterType` avec `'a_planifier_tvx' | 'a_commander'`

### Fichiers impactés
| Fichier | Action |
|---|---|
| `src/apogee-connect/types/actions.ts` | Ajout types + labels |
| `src/apogee-connect/utils/actionsAMenerCalculations.ts` | 2 nouvelles règles de détection |
| `src/components/pilotage/ActionsAMenerTab.tsx` | 2 nouveaux filtres UI |

