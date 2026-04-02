

# Plan: Manuel complet des metriques OPERIA/StatIA

## Objectif
Generer un document Markdown exhaustif et soigne (`/mnt/documents/OPERIA_MANUEL_METRIQUES.md`) documentant **chaque metrique effectivement utilisee** dans l'application, avec :
- Explication claire en francais
- Endpoints API Apogee necessaires
- Croisements de donnees a effectuer
- Formule de calcul
- Ou elle est affichee dans l'interface

## Structure du document

### 1. Introduction & Architecture
- Comment StatIA fonctionne (definitions → engine → hooks → composants)
- Les 6 endpoints API sources (apiGetFactures, apiGetProjects, apiGetInterventions, apiGetDevis, apiGetClients, apiGetUsers)
- Schema des relations entre entites (projectId comme pivot central)

### 2. Metriques par famille (toutes documentees)

Pour chaque metrique, une fiche standardisee :
```
### [ID] — [Label]
**Description** : ...
**Unite** : € / % / nombre / jours
**Endpoints API** : apiGetFactures + apiGetProjects
**Champs utilises** : data.totalHT, data.commanditaireId, ...
**Formule** : CA = Σ factures.totalHT (hors avoirs, hors annulees)
**Croisements** : Facture → Project (via projectId) → Univers (via data.universes)
**Affichage** : Dashboard, Pilotage > Statistiques > Onglet General
```

**Familles couvertes** (inventaire complet extrait du code) :

| Famille | Nb metriques | Fichier source |
|---------|-------------|----------------|
| CA | 6 | ca.ts |
| Univers | 11 | univers.ts |
| Apporteurs | 14 | apporteurs.ts |
| Techniciens | 7 | techniciens.ts |
| SAV | 10 | sav.ts |
| Devis | 10 | devis.ts |
| Recouvrement | 6 | recouvrement.ts |
| Dossiers | 7 | dossiers.ts |
| Qualite | 6 | qualite.ts |
| Productivite | 6 | productivite.ts |
| Complexite | 2 | complexite.ts |
| Reseau | 11 | reseau.ts |
| Advanced | 17 | advanced.ts |
| Advanced2 Clients | 7 | advanced2-clients.ts |
| Advanced2 Devis | 8 | advanced2-devis.ts |
| Advanced2 Factures | 4 | advanced2-factures.ts |
| Advanced2 Interventions | 6 | advanced2-interventions.ts |
| Advanced2 SAV | 4 | advanced2-sav.ts |
| Advanced2 Univers | 4 | advanced2-univers.ts |
| Advanced2 Reseau | 4 | advanced2-reseau.ts |
| Franchiseur | 17 | franchiseur.ts |
| Clients | 4 | clients.ts |
| Agences | 12 | agences.ts |
| Operations | 15 | operations.ts |
| Devis Advanced | 4 | devisAdvanced.ts |
| Veille Apporteurs | 3 | veilleApporteurs.ts |

**Total : ~188 metriques uniques** (certaines sont partagees entre fichiers)

### 3. Index des metriques par page/ecran
- Quelles metriques sont utilisees sur le Dashboard
- Quelles metriques sont utilisees en Pilotage > Statistiques
- Quelles metriques sont utilisees en Diffusion TV
- Quelles metriques sont utilisees dans le Financial Bridge (Resultat)

### 4. Annexe : Metriques appelees mais non definies
Signalement des IDs appeles dans le code mais absents du registre (`panier_moyen_ht`, `flop_apporteurs_ca`, `part_apporteurs`, `nombre_dossiers`, `delai_moyen_facturation`, `encours_global_ttc`)

## Etapes techniques

1. Ecrire un script Python qui :
   - Parse chaque fichier de definition pour extraire id, label, description, category, source, unit, aggregation
   - Scanne les hooks/composants pour identifier ou chaque metrique est utilisee
   - Genere le Markdown structure avec les fiches completes
2. Executer et deposer dans `/mnt/documents/OPERIA_MANUEL_METRIQUES.md`
3. QA : verifier la completude et la lisibilite

