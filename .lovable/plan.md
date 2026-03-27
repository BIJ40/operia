

## ✅ Fusion Veille + Suivi client → "Veille" (TERMINÉ)

L'onglet "Veille" et "Suivi client" ont été fusionnés en un seul onglet **"Veille"** dans Commercial.

### Changements effectués

- **ApporteurListPage.tsx** : Ajout des filter pills Veille (Dormants, En baisse, Stables, En hausse) + badge score Veille par ligne
- **CommercialTabContent.tsx** : Tab "Suivi client" renommé → "Veille" (icône Radar), tab "veille" supprimé
- **ProspectionTabContent.tsx** : Idem
- **types/modules.ts** : Label `commercial.suivi_client` → "Veille", `commercial.veille` marqué `deployed: false`
- **rightsTaxonomy.ts** : `commercial.veille` retiré des moduleKeys Commercial
- **headerNavigation.ts** : Entrée "Suivi client" → "Veille", entrée veille supprimée
- **ModulesMasterView.tsx** : Route `commercial.veille` supprimée
- **permissions/constants.ts** : `prospection.veille` retiré
- **Migration SQL** : Droits `commercial.veille` fusionnés dans `commercial.suivi_client`, label module_registry mis à jour

### Prochaines étapes

- Page admin de gestion du module **Suivi Client** (portail client externe / origin-box)
- Création du plan d'agence **APPORTEUR** (Suivi + Espace Apporteurs + Échanges)
