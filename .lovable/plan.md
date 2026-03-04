

## Mise à jour du Changelog — Semaine du 25 février au 4 mars 2026

### Constat
Le changelog est bloqué à V0.8.7 (31 janvier). Il manque plus d'un mois de travail, notamment les changements majeurs de cette dernière semaine.

### Nouvelle version : V0.9.0

**Nom de code suggéré** : "Commercial & CRM"

**Date** : 2026-03-04

### Entrées changelog prévues

#### Module Commercial (feature)
- Module Commercial complet avec 4 onglets : Suivi client, Comparateur, Veille, Prospects
- Scoring adaptatif des apporteurs (score composite 0-100 avec 4 métriques pondérées)
- Veille globale avec classement des partenaires + ScoreCard individuelle
- Comparateur de métriques apporteurs avec calcul automatique quotidien (cron 02h30)
- Bouton "Recalculer" pour rafraîchissement manuel des métriques

#### CRM Prospects (feature)
- Pipeline prospects en 6 états (Nouveau → Contacté → RDV → Négociation → Gagné/Perdu)
- Import prospects via Excel avec mapping flexible
- Pool de prospects importés avant création de fiche
- Scoring 5 étoiles et extraction automatique de la ville depuis l'adresse
- Panneau de détail avec notes, RDV et historique des interactions

#### Renommages (improvement)
- Prospection → Commercial (clé module inchangée : 'prospection')
- Apporteurs → Suivi client
- Navigation par onglets navigateur pour les fiches partenaires

#### Fix Tickets — Origine (fix)
- reported_by utilise désormais le prénom de l'utilisateur connecté (au lieu de "agence")
- Suppression des origines AGENCE et AUTRE du badge OrigineBadge
- Migration des tickets existants avec reported_by = AGENCE/AUTRE

#### Gating granulaire (improvement)
- Sous-permissions par module : options 'dashboard', 'comparateur', 'veille', 'prospects'
- Visibilité sous-onglets Outils filtrée par module activé

### Fichiers modifiés

1. **`src/config/changelog.ts`** — Ajout entrée V0.9.0 en première position du tableau `CHANGELOG`
2. **`src/config/version.ts`** — Bump `APP_VERSION` à `'0.9.0'` et `APP_CODENAME` à `'Commercial & CRM'`

