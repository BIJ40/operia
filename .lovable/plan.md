

# Plan : Tri, filtres et couleurs — Tableau "Suivi client"

## Objectif
Rendre le tableau des apporteurs (Commercial > Suivi client) interactif (tri/filtre par colonne) et visuellement riche avec des indicateurs colorés.

## Fichier impacté
- `src/prospection/pages/ApporteurListPage.tsx` (seul fichier à modifier)

## Changements

### 1. Tri par colonne
- Ajouter un state `sortColumn` / `sortDirection` (asc/desc toggle)
- Colonnes triables : Dossiers, CA HT, Taux transfo, Panier moyen, Factures
- Header cliquable avec icône flèche (ArrowUpDown / ArrowUp / ArrowDown)
- Appliquer `sort()` sur le tableau filtré avant le rendu

### 2. Filtres par colonne
- Ajouter des filtres inline sous les headers :
  - **Dossiers** : seuil min (input number compact)
  - **CA HT** : seuil min
  - **Taux transfo** : range (ex: < 30%, 30-60%, > 60%) via petit select
  - **Factures** : seuil min
- Bouton "Reset filtres" discret quand un filtre est actif

### 3. Couleurs et indicateurs visuels
- **CA HT** : couleur du texte selon le montant (vert foncé si élevé, gris si faible)
- **Taux transfo** : pastille colorée (rouge < 30%, orange 30-60%, vert > 60%)
- **Panier moyen** : badge coloré (bleu si au-dessus de la médiane, gris sinon)
- **Dossiers** : barre de progression discrète en fond de cellule (proportionnelle au max)
- **Ligne "Alerte"** : fond légèrement rouge si taux transfo < 30% ET dossiers ≥ 5
- **Rang** : ajouter une colonne # avec rang coloré (or/argent/bronze pour top 3)

### 4. Améliorations UX complémentaires
- Ligne hover plus marquée avec accent orange (domaine commercial)
- Header sticky avec fond opaque
- Afficher le total / moyenne en pied de tableau (ligne récap)

## Détails techniques
- Tout en local dans le composant, pas de nouvelle dépendance
- Utiliser `useMemo` pour le tri/filtre combiné
- Calcul de la médiane du panier moyen pour le seuil de couleur
- Les couleurs utilisent les classes Tailwind existantes (emerald, amber, red, blue)

