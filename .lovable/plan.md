

## Diagnostic : CA par technicien incohérent à 3 endroits

### Cause racine identifiée

Les 3 zones affichent des valeurs calculées par **2 moteurs de calcul différents** :

```text
┌─────────────────────────┬──────────────────────────────────┐
│ Zone UI                 │ Source de calcul                 │
├─────────────────────────┼──────────────────────────────────┤
│ Top 5 Techniciens       │ top_techniciens_ca               │
│                         │ → appelle ca_par_technicien      │
│                         │ → MOTEUR UNIFIÉ ✅               │
├─────────────────────────┼──────────────────────────────────┤
│ CA par Technicien       │ topTechniciens (même source)     │
│ (modal)                 │ → MOTEUR UNIFIÉ ✅               │
├─────────────────────────┼──────────────────────────────────┤
│ Heatmap CA HT           │ ca_par_technicien_univers        │
│ (onglet CA HT)          │ → CALCUL LOCAL SÉPARÉ ❌         │
│                         │ (boucle manuelle sur factures    │
│                         │  avec sa propre logique)         │
├─────────────────────────┼──────────────────────────────────┤
│ KPI "CA Total"          │ Somme des totaux de la heatmap   │
│                         │ → CALCUL LOCAL SÉPARÉ ❌         │
└─────────────────────────┴──────────────────────────────────┘
```

Le moteur unifié (`unifiedTechCAEngine`) et le calcul local dans `ca_par_technicien_univers` divergent sur :
- Le traitement du **lissage** (factures sans temps productif)
- La gestion des **factures sans projet** (attribuées à "Agence" vs ignorées)
- Les **filtres d'état de facture** (vérifications légèrement différentes)
- Le **double comptage potentiel** via les ID numériques vs string

### Plan de correction

1. **Réécrire `ca_par_technicien_univers`** pour qu'il appelle le moteur unifié (`computeUnifiedTechCAAsStatResult`) comme `ca_par_technicien`, puis ventile le résultat par univers — au lieu de recalculer tout de zéro avec sa propre logique.

2. **Aligner `caTotal` dans le hook** : au lieu de sommer les `technicienUniversStats` localement, utiliser directement le `breakdown.totalCA` du moteur unifié déjà chargé via `ca_par_technicien`.

3. **Supprimer le code dupliqué** : la boucle manuelle sur les factures dans `ca_par_technicien_univers` (lignes 240-490) sera remplacée par un appel au moteur unifié + ventilation univers.

### Résultat attendu

Les 3 zones (Top 5, CA par technicien, Heatmap CA HT) afficheront exactement les mêmes valeurs par technicien, car elles utiliseront toutes le même moteur de calcul.

