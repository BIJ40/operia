

# Plan : Refonte UI Portail Apporteur V2 — Cockpit de pilotage

## Constat

Le backend V2 est 100% opérationnel (edge functions, types, hooks). Mais l'UI est restée V1 :
- **Accueil** : 3 cartes KPI basiques + planning grille basique
- **Dossiers** : table brute sans stepper ni enrichissement V2
- **Rapport** : placeholder vide

## Livrables

### 1. Refonte AccueilTabContent → Cockpit Dashboard

Remplacer le contenu actuel par un vrai cockpit consommant `useApporteurKpis` :

- **8 cartes KPI** en grid responsive (4 cols desktop, 2 mobile) :
  - CA généré, Panier moyen, Taux transformation, Dossiers en cours
  - Devis envoyés, Factures en attente (montant), Délai moyen RDV, Délai validation devis
  - Chaque carte affiche la valeur + trend N-1 (flèche verte/rouge + %)

- **Indice de collaboration** : jauge circulaire 0-100 avec badge Bronze/Silver/Gold, breakdown des 4 sous-scores

- **Répartition univers** : donut chart (recharts) avec légende

- **Alertes** : bannière conditionnelle si alertes haute sévérité (factures >30j, devis non validés), avec count + montant + sample refs

- **Planning** : conservé tel quel en dessous (pas de refonte planning pour l'instant)

- Sélecteur de période en haut (Mois / Trimestre / Année)

### 2. Refonte DossiersTabContent → Pipeline visuel

Modifications ciblées sur le contenu existant :

- **Stepper horizontal** dans le dialog détail dossier : 6 étapes visuelles (Créé → RDV → Devis envoyé → Devis validé → Facture → Réglé) utilisant les données `v2.stepper` si disponibles, fallback sur dates V1

- **Badges enrichis** : triple statut (dossier + devis + facture) au lieu d'un seul badge

- **Colonnes univers** : ajouter une colonne "Univers" dans la table si données V2 présentes

- Le reste de la table (tri, filtre, recherche) reste inchangé

### 3. Rapport d'activité → Vraie page avec charts

Remplacer le placeholder par une page consommant `useApporteurKpis({ period: 'year' })` :

- **4 graphiques linéaires** (recharts) sur 12 mois :
  - CA HT mensuel
  - Nombre de dossiers
  - Taux de transformation
  - Délais moyens (RDV + validation devis)

- **Tableau récap** : KPIs clés de la période

- Sélecteur de période (Trimestre / Année)

- Bouton "Exporter PDF" (placeholder, pas d'implémentation PDF pour l'instant)

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/apporteur/components/tabs/AccueilTabContent.tsx` | Refonte complète |
| `src/apporteur/components/tabs/DossiersTabContent.tsx` | Enrichir dialog + badges |
| `src/apporteur/components/tabs/RapportTabContent.tsx` | Refonte complète |
| Nouveaux composants extraits (optionnel) | KpiCard, CollaborationGauge, UniversDonut |

## Dépendances

- `recharts` : déjà installé
- `useApporteurKpis` : déjà prêt
- Types V2 : déjà définis
- Aucune migration DB, aucun changement edge function

## Ce qui n'est PAS dans ce plan

- Refonte du planning (conservé tel quel)
- Export PDF réel (bouton placeholder uniquement)
- Refonte de la navigation (déjà faite)

