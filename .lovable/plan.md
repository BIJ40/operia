

# Renommer les types et l'en-tête de colonne

## Changements dans `ModulesMasterView.tsx`

### 1. Renommer les labels dans `NODE_TYPE_CONFIG` (ligne 89-93)

| Avant | Après |
|---|---|
| `section` → `'Section'` | `section` → `'Module'` |
| `screen` → `'Écran'` | `screen` → `'Section'` |
| `feature` → `'Feature'` | `feature` → `'Outil'` |

### 2. Renommer l'en-tête de colonne (ligne 462)

| Avant | Après |
|---|---|
| `Module` | `Nom` |

Deux modifications localisées, aucun impact sur la logique.

