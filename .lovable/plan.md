## Réponses à vos questions

### 1. Comment se calcule la productivité ?

La productivité est calculée dans `usePerformanceTerrain.ts` (ligne 451) :

```
productivityRate = timeProductive / timeTotal
```

- **timeProductive** : somme des minutes passées sur des interventions de types **productifs** (dépannage, travaux, recherche de fuite, repair, work)
- **timeTotal** : somme de TOUTES les minutes planifiées (productives + non productives)
- **timeNonProductive** : minutes sur des types **non productifs** (RT, RDV technique, SAV, diagnostic)

Seuils d'affichage :

- **< 50%** → Zone critique (rouge)
- **50-65%** → Warning (orange)
- **≥ 65%** → Optimal (vert)

Georges affiche 100% car sa seule intervention est productive (1 intervention = 11h productif, 0h non productif → 100%).

### 2. "Modifier paramètres" ne fonctionne pas

Le bouton `Modifier paramètres` ouvre un `TechnicianQuickEditDialog` qui cherche le collaborateur dans la table `collaborators` via `apogee_user_id`. Si Georges Aladame **n'a pas de fiche collaborateur liée** (pas de correspondance `apogee_user_id`), le dialog affiche un message d'erreur "Ce technicien n'a pas de fiche salarié liée" sans possibilité de sauvegarder.

**Cause probable** : le technicien n'est pas synchronisé entre Apogée et le module Salariés.

**Correction** : vérifier dans la base que `collaborators.apogee_user_id` correspond bien à l'ID Apogée de Georges. Si la fiche existe mais n'est pas liée, mettre à jour le champ.

### 3. Georges est en arrêt — son score devrait être plus bas

Le module Performance **ne prend pas en compte les absences/arrêts**. Il mesure uniquement le ratio temps productif / temps total planifié. Si Georges a 1 intervention productive et aucune non-productive, il affiche 100% de productivité et 5% de charge (très peu de temps planifié par rapport à sa capacité théorique de 35h/semaine).

Le score radar montre correctement : **productivité 100%** (tout ce qu'il a fait est productif) mais **charge 5%** (quasi rien planifié). Le système n'a pas de notion "arrêt de travail" qui viendrait baisser le score.

## Plan de correction (2 points)

### A. Fixer "Modifier paramètres"

**Fichier** : `src/components/performance/TechnicianQuickEditDialog.tsx`

- Ajouter un `try/catch` plus explicite et un log console dans le `queryFn` (ligne 60-77)
- Si `collaborator` est null, proposer un bouton "Créer la liaison" qui ouvre un sélecteur pour associer le technicien Apogée à un collaborateur existant
- En attendant, vérifier en base si Georges a bien une entrée `collaborators` avec le bon `apogee_user_id`

### B. Gérer les absences dans le calcul de performance

**Fichier** : `src/hooks/usePerformanceTerrain.ts`

- Avant de construire les stats, vérifier si le collaborateur a un statut d'absence actif (via `collaborators.leaving_date` ou un futur champ `absence_start`/`absence_end`)
- Si en arrêt : soit exclure le technicien du dashboard, soit afficher un badge "Absent" et mettre sa capacité à 0 (ce qui baisserait effectivement sa charge apparente mais pas sa productivité)
- Option recommandée : ajouter un badge visuel "En arrêt" sur la carte du technicien et ne pas le compter dans les moyennes d'équipe  
  
  
Il existe un statut d'absence "arret maladie" a retrouver dans l'API cela affiche un creneau sur le planning avec cette mention.. a voir   
  
De plus les performences doivent etre celles du mois en cours (avec vision future si debut de mois selon le planning etc...) et on doit pouvoir voir egalement les mois passéz, donc possibilité d'avoir un selecteur temporel pour voir sur 1 ou plusieurs mois 
- &nbsp;