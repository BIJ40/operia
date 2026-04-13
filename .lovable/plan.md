

# Plan : Rapport Complet StatIA — Métriques Pilotage & Commercial

## Objectif

Générer un document exhaustif (PDF ou Markdown) documentant **chaque statistique et métrique** des modules Pilotage et Commercial, incluant :
- L'algorithme de calcul exact
- Les endpoints API Apogée utilisés
- Les clés de jointure entre entités
- Les filtres et règles métier appliqués
- Les tableaux croisés et dimensions de ventilation

## Scope couvert

### Pilotage (9 sous-onglets)

**1. Général / KPIs**
- `ca_global_ht` — CA total HT (factures - avoirs)
- `ca_par_mois` — CA ventilé par mois
- `ca_moyen_par_jour` — CA HT moyen par jour
- `du_client` — Dû client TTC (reste à encaisser)
- `panier_moyen` — Montant moyen par facture
- `nombre_devis`, `montant_devis` — Volume et montant devis
- `taux_transformation_devis_nombre/montant` — Taux transfo en nombre et en €
- `devis_signes_non_factures` — Stock de travaux à lancer
- `taux_recouvrement_global` — % CA encaissé vs facturé
- `montant_restant`, `factures_impayees` — Encours à recouvrer

**2. Apporteurs**
- `ca_par_apporteur` — CA HT par commanditaire
- `dossiers_par_apporteur` — Nb dossiers par apporteur
- `top_apporteurs_ca` — Classement Top N
- `taux_transformation_apporteur` — Taux transfo devis par apporteur
- `apporteurs_inactifs` — Apporteurs sans activité > X jours
- `ca_par_type_apporteur` — CA par catégorie (Assureurs, Bailleurs, Syndics...)
- `dossiers_par_type_apporteur`, `panier_moyen_par_type_apporteur`
- `taux_transfo_par_type_apporteur`, `taux_sav_par_type_apporteur`
- `ca_mensuel_segmente` — Apporteurs vs Particuliers par mois
- `apporteurs_du_global_ttc` — Encours TTC apporteurs
- `apporteurs_delai_paiement_moyen`, `apporteurs_delai_dossier_facture`

**3. Univers**
- `ca_par_univers` — CA HT ventilé par univers métier (prorata si multi-univers)
- `dossiers_par_univers` — Comptage par univers
- `panier_moyen_par_univers` — CA/facture par univers
- `interventions_par_univers` — Nb interventions par univers
- `taux_sav_par_univers` — % SAV par univers
- `ca_mensuel_par_univers` — Évolution mensuelle empilée

**4. Techniciens**
- `ca_par_technicien` — CA au prorata du temps (moteur unifié)
- `ca_par_technicien_univers` — Matrice Technicien × Univers
- `top_techniciens_ca` — Classement Top N
- `ca_moyen_par_tech` — CA total / nb techs actifs

**5. Prévisionnel** — Devis signés non facturés, pipeline maturité

**6. Recouvrement**
- `taux_recouvrement_global`, `montant_encaisse`, `montant_restant`
- `factures_impayees`, `encours_par_apporteur`
- `delai_paiement_dossier`

**7. Maps** — Analyses géographiques (modes choroplèthe)

**8. Résultat** — P&L / Compte de résultats (60 lignes, 9 sections)

**9. Rentabilité Dossier** — Snapshots de rentabilité projet

### Commercial — Veille Apporteurs

- `apporteurs_dormants` — Sans projet depuis X jours
- `apporteurs_en_declassement` — CA en baisse période A vs B
- `apporteurs_sous_seuil` — Sous seuil CA HT configurable
- Score de risque consolidé (0-100)
- Fiche détaillée par apporteur (CA, variation, inactivité, criticité)

### Portail Apporteur (Edge Function `get-apporteur-stats`)

- KPIs V2 : dossiers en cours, devis envoyés/validés/refusés, factures, CA, panier moyen, taux transfo, délais RDV/devis
- Score de collaboration (volume, régularité, transfo, délai)
- Alertes (factures retard 30j, devis non validé 15j, etc.)
- Séries 12 mois (CA, dossiers, taux transfo, délais)

## Structure du document

Le rapport contiendra pour CHAQUE métrique :
1. **ID technique** et label
2. **Description fonctionnelle**
3. **Formule / Algorithme** (pseudo-code)
4. **Endpoints API Apogée** : `apiGetFactures`, `apiGetProjects`, `apiGetInterventions`, `apiGetUsers`, `apiGetClients`, `apiGetDevis`
5. **Clés de jointure** : `facture.projectId → project.id`, `project.commanditaireId → client.id`, etc.
6. **Champs extraits** : `data.totalHT`, `data.calcReglementsReste`, `data.type2`, `data.visites[].usersIds`, etc.
7. **Filtres appliqués** : états inclus/exclus, dateRange, avoirs
8. **Règles métier STATIA_RULES** applicables

## Implémentation technique

- Script Python générant un PDF de ~50-80 pages via `reportlab` ou Markdown
- Source : lecture directe des fichiers de définition TypeScript du projet
- Output : `/mnt/documents/OPERIA_STATIA_RAPPORT_COMPLET.pdf`

## Estimation

- ~200+ métriques à documenter
- ~50-80 pages de rapport
- Temps de génération : ~5 minutes

