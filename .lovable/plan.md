

# Plan : Implementation MVP Previsionnel

## Confirmation des points techniques

1. **Single-pass** : Tous les champs enrichis (pipelineMaturity, risk 3D, dataQualityFlags, technicienIds, ageJours, includedIn*) seront calcules dans la boucle existante (ligne 340-455 de `chargeTravauxEngine.ts`). Complexite O(n). Les 4 fonctions d'agregation post-loop (chargeParTechnicien, pipelineAge, chargeParSemaine, forecastReliability) iterent chacune une fois sur le tableau `parProjet` deja construit -- O(n) chacune.

2. **Pipeline maturity** : `bloque` prioritaire (teste en premier), puis `planifie`, `pret_planification`, `a_commander`, `commercial`.

3. **Risk scoring** : Flux (0-33) : age>30j +15, age>15j +8, wait_fourn +10, multi-visites sans progression +10. Data (0-33) : no hours +11, no tech +11, no devis +11. Value (0-34) : >10k +17, >5k +10, >2k +7. Global = min(100, flux+data+value).

4. **Charge hebdomadaire** : Semaine ISO via `getISOWeek`/`getISOWeekYear` de date-fns. Interventions sans date exclues du calcul mais flaggees `MISSING_PLANNED_DATE`. Heures dispo = nbTechs * 35h.

5. **Forecast reliability** : moyenne des 4 ratios (devisHT>0, heuresTech>0, techAssigne, datePlanifiee) * 100.

6. **CA Pipeline** : Inclut uniquement `to_planify_tvx`, `devis_to_order`, `wait_fourn`, `planified_tvx`. Exclut facture/annule/refuse.

7. **Reutilisable reseau** : Le moteur prend des tableaux en entree -- pour N agences, concatener les tableaux avant appel. Aucune modification structurelle necessaire.

---

## Ordre d'implementation

### Etape 1 : Enrichir le moteur (`chargeTravauxEngine.ts`)

- Ajouter `planified_tvx` a `ETATS_ELIGIBLES` et `STATE_MAPPING`
- Ajouter les types : `DataQualityFlag`, `PipelineMaturity`, `ChargeTechnicien`, `PipelineAgeBucket`, `ChargeParSemaine`
- Enrichir `ChargeTravauxProjet` avec les 12 nouveaux champs
- Enrichir `ChargeTravauxResult` avec `parTechnicien[]`, `pipelineAge[]`, `dossiersRisque[]`, `chargeParSemaine[]`, `forecastReliabilityScore`, `caPipelineTotal`
- Dans la boucle principale (ligne 340) : calculer pipelineMaturity, risk 3D, dataQualityFlags, technicienIds (depuis interventions), ageJours (depuis project.createdAt), includedInForecastCalc/ChargeCalc
- Ajouter 4 fonctions post-loop pures : `computeChargeParTechnicien`, `computePipelineAge`, `computeChargeParSemaine`, `computeForecastReliability`
- ~300 lignes ajoutees

### Etape 2 : Enrichir le hook (`useChargeTravauxAVenir.ts`)

- Ajouter `services.getUsers(agencySlug)` dans le `Promise.all` de `globalQuery` (deja en cache, zero cout)
- Passer `users` aux nouvelles fonctions moteur dans le `useMemo`
- Exposer le `ChargeTravauxResult` enrichi

### Etape 3 : Creer les 5 sous-composants UI

Tous dans `src/apogee-connect/components/stats-hub/previsionnel/` :

| Fichier | Contenu |
|---------|---------|
| `PrevisionnelExecutive.tsx` | 5 KPI cards : CA pipeline, charge couverte (jauge), dossiers a risque, fiabilite previsionnel, CA planifie (CAPlanifieCard existant) |
| `PipelineSection.tsx` | Bar chart pipeline par etat (4 etats + nb dossiers + CA + age moyen) + 4 cards vieillissement (buckets 0-7j, 8-15j, 16-30j, 30+j) |
| `ChargeSection.tsx` | Bar chart horizontal charge par technicien + 4 jauges semaine S/S+1/S+2/S+3 colorees vert/orange/rouge |
| `ActionsSection.tsx` | Collapsible : table dossiers a commander + table dossiers a planifier |
| `RiskSection.tsx` | Collapsible (ferme par defaut) : table dossiers tries par riskScoreGlobal desc, badges colores flux/data/value |

Chaque composant recoit des props typees depuis `ChargeTravauxResult`. Zero logique metier dans l'UI.

### Etape 4 : Refactoriser `PrevisionnelTab.tsx`

Remplacer les 670 lignes par un orchestrateur ~120 lignes :
```
PrevisionnelTab
 ├ PrevisionnelExecutive (props: totaux, forecastReliabilityScore, caPipelineTotal, rawData)
 ├ PipelineSection (props: parEtat, pipelineAge)
 ├ ChargeSection (props: parTechnicien, chargeParSemaine)
 ├ ActionsSection (props: parProjet filtre par etat)
 └ RiskSection (props: dossiersRisque)
```

Conserver les constantes de couleur (`UNIVERS_COLORS`, `ETAT_CONFIG`) et les helpers de formatage dans le fichier orchestrateur ou un fichier constants partage.

---

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Modifier | `src/statia/shared/chargeTravauxEngine.ts` |
| Modifier | `src/statia/hooks/useChargeTravauxAVenir.ts` |
| Reecrire | `src/apogee-connect/components/stats-hub/tabs/PrevisionnelTab.tsx` |
| Creer | `src/apogee-connect/components/stats-hub/previsionnel/PrevisionnelExecutive.tsx` |
| Creer | `src/apogee-connect/components/stats-hub/previsionnel/PipelineSection.tsx` |
| Creer | `src/apogee-connect/components/stats-hub/previsionnel/ChargeSection.tsx` |
| Creer | `src/apogee-connect/components/stats-hub/previsionnel/ActionsSection.tsx` |
| Creer | `src/apogee-connect/components/stats-hub/previsionnel/RiskSection.tsx` |

Estimation : ~1100 lignes nouvelles, remplacement de ~570 lignes existantes. Aucune nouvelle requete API. Toutes les donnees sont deja en cache.

