

## Plan : Restructurer Commercial et Pilotage

### Problème actuel

Commercial a 3 sous-onglets dont "Suivi client" qui contient lui-même 5 sous-sous-onglets (via `ProspectionTabContent`). C'est un niveau de profondeur inutile. De plus, "Devis acceptés" et "Incohérences" relèvent du Pilotage.

### Structure cible

```text
PILOTAGE
  ├── Statistiques
  ├── Performance
  ├── Actions à mener
  ├── Devis acceptés      ← déplacé depuis Commercial
  └── Incohérences        ← déplacé depuis Commercial

COMMERCIAL
  ├── Suivi client         ← ex "apporteurs" dans ProspectionTabContent
  ├── Comparateur
  ├── Veille
  ├── Prospects
  └── Réalisations
```

### Modifications

**1. `CommercialTabContent.tsx`** — Remplacement complet

Supprimer la structure actuelle (3 tabs dont ProspectionTabContent en enfant). Le remplacer par le contenu actuel de `ProspectionInner` (5 tabs directement), en gardant le `ApporteurTabsProvider` wrapper et le filtrage par permissions.

**2. `PilotageTabContent.tsx`** — Ajouter 2 sous-onglets

Ajouter "Devis acceptés" (`DevisAcceptesView`) et "Incohérences" (`AnomaliesDevisDossierView`) comme 4e et 5e pill tabs, avec `requiresModule: 'agence'`.

**3. Aucun autre fichier impacté**

- `ProspectionTabContent.tsx` reste disponible mais n'est plus importé par Commercial (import direct des composants enfants)
- Pas de changement de droits / module_registry
- Les composants métier (`DevisAcceptesView`, `AnomaliesDevisDossierView`, `ApporteurListPage`, etc.) ne changent pas

