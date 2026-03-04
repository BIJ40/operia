## Diagnostic

Le comparateur affiche tout à zéro parce que la table `metrics_apporteur_daily` est **vide**. Cette table est alimentée par la Edge Function `compute-apporteur-metrics` qui doit être déclenchée manuellement ou par un cron — mais elle n'a jamais été exécutée pour cette agence.

## Plan

### 1. Déclencher le calcul initial des métriques

Appeler la Edge Function `compute-apporteur-metrics` avec les paramètres de l'agence DAX pour peupler la table :

```
POST /functions/v1/compute-apporteur-metrics
Body: { "agency_id": "58d8d39f-7544-4e78-86f9-c182eacf29f5" }
```

Cela va charger les projets/devis/factures depuis l'API Apogée et insérer les métriques quotidiennes dans `metrics_apporteur_daily`.

### 2. Ajouter un bouton "Recalculer" visible dans le comparateur

Dans `ApporteurComparisonPage.tsx`, ajouter un bouton qui appelle `compute-apporteur-metrics` pour permettre à l'utilisateur de rafraîchir les données sans intervention technique.

### 3. Vérifier le cron nocturne

S'assurer qu'un cron est configuré dans `supabase/config.toml` pour déclencher automatiquement `compute-apporteur-metrics` chaque nuit, sinon le configurer.

---

**Première action** : exécuter manuellement la fonction pour peupler les données, puis vérifier que le comparateur affiche les KPIs.  
  
  
s'asurer a l'avenir que ce sera automatique pour tout eagence 

&nbsp;