# StatIA V2 - Mapping des Statistiques

## Résumé

| Catégorie | Métriques A | Métriques B | Métriques C | Total |
|-----------|-------------|-------------|-------------|-------|
| CA | 5 | 0 | 0 | 5 |
| Univers | 2 | 0 | 0 | 2 |
| Apporteurs | 2 | 0 | 0 | 2 |
| Techniciens | 9 | 0 | 0 | 9 |
| SAV | 6 | 0 | 0 | 6 |
| Devis | 4 | 0 | 0 | 4 |
| Recouvrement | 4 | 0 | 0 | 4 |
| Dossiers | 6 | 0 | 0 | 6 |
| Qualité | 6 | 0 | 0 | 6 |
| **Total** | **44** | **0** | **0** | **44** |

---

## Catégorie: CA (Chiffre d'Affaires)

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `ca_global_ht` | CA Global HT | dashboardCalculations.ts | A | ✅ Implémenté |
| `ca_par_mois` | CA par Mois | dashboardCalculations.ts | A | ✅ Implémenté |
| `ca_mensuel` | CA Mensuel | Alias ca_par_mois | A | ✅ Implémenté |
| `du_client` | Dû Client | dashboardCalculations.ts | A | ✅ Implémenté |
| `panier_moyen` | Panier Moyen | dashboardCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Univers

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `ca_par_univers` | CA par Univers | universCalculations.ts | A | ✅ Implémenté |
| `ca_univers_apporteur` | CA Univers × Apporteur | universCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Apporteurs

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `ca_par_apporteur` | CA par Apporteur | apporteursCalculations.ts | A | ✅ Implémenté |
| `top_apporteurs_ca` | Top Apporteurs | apporteursCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Techniciens

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `ca_par_technicien` | CA par Technicien | technicienUniversEngine.ts | A | ✅ Implémenté |
| `ca_par_technicien_univers` | CA Tech × Univers | technicienUniversEngine.ts | A | ✅ Implémenté |
| `top_techniciens_ca` | Top Techniciens | technicienUniversEngine.ts | A | ✅ Implémenté |
| `ca_par_heure_global` | CA/heure global | technicienUniversEngine.ts | A | ✅ Implémenté |
| `ca_par_heure_par_technicien` | CA/heure par tech | technicienUniversEngine.ts | A | ✅ Implémenté |
| `productivite_par_univers` | Productivité/univers | technicienUniversEngine.ts | A | ✅ Implémenté |
| `nb_heures_productives` | Heures productives | technicienUniversEngine.ts | A | ✅ Implémenté |
| `nb_interventions_par_technicien` | Interventions/tech | technicienUniversEngine.ts | A | ✅ Implémenté |
| `taux_utilisation_techniciens` | Taux utilisation | technicienUniversEngine.ts | A | ✅ Implémenté |

---

## Catégorie: SAV

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `taux_sav_global` | Taux SAV Global | savCalculations.ts | A | ✅ Implémenté |
| `taux_sav_par_univers` | Taux SAV/Univers | savCalculations.ts | A | ✅ Implémenté |
| `taux_sav_par_apporteur` | Taux SAV/Apporteur | savCalculations.ts | A | ✅ Implémenté |
| `nombre_sav` | Nombre SAV | savCalculations.ts | A | ✅ Implémenté |
| `nb_interventions_sav` | Nb interventions SAV | savCalculations.ts | A | ✅ Implémenté |
| `ca_impacte_sav` | CA impacté SAV | savCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Devis

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `taux_transformation_devis_nombre` | Taux transfo (nombre) | devisCalculations.ts | A | ✅ Implémenté |
| `taux_transformation_devis_montant` | Taux transfo (montant) | devisCalculations.ts | A | ✅ Implémenté |
| `nombre_devis` | Nombre de devis | devisCalculations.ts | A | ✅ Implémenté |
| `montant_devis` | Montant devis HT | devisCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Recouvrement

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `taux_recouvrement_global` | Taux recouvrement | recouvrementCalculations.ts | A | ✅ Implémenté |
| `montant_encaisse` | Montant encaissé | recouvrementCalculations.ts | A | ✅ Implémenté |
| `montant_restant` | Reste à encaisser | recouvrementCalculations.ts | A | ✅ Implémenté |
| `factures_impayees` | Factures impayées | recouvrementCalculations.ts | A | ✅ Implémenté |

---

## Catégorie: Dossiers

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `nb_dossiers_crees` | Dossiers créés | dashboardCalculations.ts | A | ✅ Implémenté |
| `duree_moyenne_dossier` | Durée moyenne dossier | nouveau | A | ✅ Implémenté |
| `duree_mediane_dossier` | Durée médiane dossier | nouveau | A | ✅ Implémenté |
| `taux_multi_visites` | Taux multi-visites | nouveau | A | ✅ Implémenté |
| `nb_rt_par_dossier` | Nb RT par dossier | nouveau | A | ✅ Implémenté |
| `taux_degats_eaux` | Taux dégâts des eaux | nouveau | A | ✅ Implémenté |

---

## Catégorie: Qualité

| StatIA ID | Label | Origine | Classe | Statut |
|-----------|-------|---------|--------|--------|
| `taux_dossiers_multi_univers` | Taux multi-univers | nouveau | A | ✅ Implémenté |
| `taux_dossiers_sans_devis` | Taux sans devis | nouveau | A | ✅ Implémenté |
| `delai_validation_devis` | Délai validation devis | nouveau | A | ✅ Implémenté |
| `taux_factures_avec_avoir` | Taux avec avoir | nouveau | A | ✅ Implémenté |
| `montant_total_avoirs` | Montant avoirs | nouveau | A | ✅ Implémenté |
| `nb_moyen_interventions_dossier` | Nb interventions/dossier | nouveau | A | ✅ Implémenté |

---

## Fichiers de définitions

| Fichier | Métriques | Catégorie |
|---------|-----------|-----------|
| `src/statia/definitions/ca.ts` | 5 | CA |
| `src/statia/definitions/univers.ts` | 2 | Univers |
| `src/statia/definitions/apporteurs.ts` | 2 | Apporteurs |
| `src/statia/definitions/techniciens.ts` | 3 | Techniciens (base) |
| `src/statia/definitions/productivite.ts` | 6 | Techniciens (productivité) |
| `src/statia/definitions/sav.ts` | 6 | SAV |
| `src/statia/definitions/devis.ts` | 4 | Devis |
| `src/statia/definitions/recouvrement.ts` | 4 | Recouvrement |
| `src/statia/definitions/dossiers.ts` | 6 | Dossiers |
| `src/statia/definitions/qualite.ts` | 6 | Qualité |

---

## Sources de données

| Source | Endpoint API | Utilisée par |
|--------|--------------|--------------|
| `factures` | apiGetFactures | CA, Recouvrement, SAV, Qualité |
| `projects` | apiGetProjects | Univers, SAV, Dossiers, Qualité |
| `interventions` | apiGetInterventions | Techniciens, SAV, Dossiers |
| `devis` | apiGetDevis | Devis, Qualité |
| `clients` | apiGetClients | Apporteurs, SAV |
| `users` | apiGetUsers | Techniciens |

---

## Règles métier (STATIA_RULES)

Toutes les métriques respectent les règles centralisées dans `src/statia/domain/rules.ts`:

- **Avoirs**: traités comme montants négatifs, réduisent le CA
- **RT**: exclus du CA technicien (RT_generates_NO_CA: true)
- **SAV**: CA impact = 0€, exclus des stats technicien
- **Types productifs**: depannage, travaux, recherche de fuite
- **Types non-productifs**: RT, TH, SAV, diagnostic
- **Date prioritaire**: dateReelle > date
- **Univers par défaut**: "Non classé"
- **Apporteur par défaut**: "Direct"
