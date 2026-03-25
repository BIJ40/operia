

# Audit PDF exhaustif du module "Performance Terrain"

## Objectif
Générer un document PDF complet documentant l'architecture, les règles métier, les calculs, les endpoints et la logique du module Performance Terrain.

## Contenu du document (structure)

Le PDF couvrira les sections suivantes, basées sur l'analyse complète du code source :

### 1. Vue d'ensemble du module
- Philosophie : "vue équilibrée, non punitive, orientée capacité et qualité"
- 7 fichiers source, 1 hook principal (~580 lignes), 5 composants visuels

### 2. Architecture technique
- Hook principal : `usePerformanceTerrain` (src/hooks/usePerformanceTerrain.ts)
- Composants : PerformanceDashboard, TeamHeatmap, TechnicianRadarChart, SavDetailsDrawer, TechnicianQuickEditDialog, PerformanceLegend
- Dépendances : DataService (API Apogée), Supabase (collaborators, employment_contracts, sav_validations)

### 3. Sources de données et endpoints
- `DataService.loadAllData()` → charge interventions, projects, users, creneaux
- Endpoints Apogée : apiGetInterventions, apiGetProjects, apiGetUsers, getInterventionsCreneaux
- Tables Supabase : collaborators, employment_contracts, sav_validations

### 4. Règles métier et calculs détaillés

**4.1 Identification des techniciens**
- Filtre : `user.type === 'technicien' || 'utilisateur'`
- Exclusion : commerciaux, admin, assistantes, direction, comptables

**4.2 Productivité**
- Formule : `productivityRate = timeProductive / timeTotal`
- Types productifs (StatIA) : depannage, repair, travaux, work
- Types non productifs : RT, rdv, rdvtech, sav, diagnostic
- Classification : matching par `includes()` sur type/type2 normalisés
- Seuils : Optimal ≥65%, Attention 50-65%, Critique <50%

**4.3 Charge de travail**
- Formule : `loadRatio = timeTotal / capacityMinutes`
- Capacité : `weeklyHours / 5 * 60 * nbJoursPériode`
- Source heures hebdo : contrat RH (employment_contracts.weekly_hours), défaut 35h
- Seuils : Équilibré 80-110%, Sous-charge <80%, Surcharge >110%

**4.4 Détection SAV**
- Source 1 : `intervention.type2 === 'sav'` (égalité exacte, case-insensitive)
- Source 2 : `visite.type2 === 'sav'` dans les visites de l'intervention
- Source 3 : `project.data.pictosInterv` contient 'sav'
- Taux : `savRate = savCount / interventionsCount`
- Seuils : Optimal ≤3%, Attention 3-8%, Critique >8%

**4.5 Estimation durée intervention**
- Priorité : duration explicite → visites.dureeMinutes → calcul heureDebut/heureFin → défaut (90min productif, 45min non-productif, 60min fallback)

**4.6 Slots de temps (source des données)**
- Source principale : visites extraites des interventions (intervention.data.visites)
- Source secondaire (fallback) : getInterventionsCreneaux
- Filtrage temporel par dateRange
- Attribution : chaque technicien dans usersIds reçoit la durée COMPLÈTE (pas de division)

**4.7 Score composite (Heatmap)**
- 3 axes notés 0-2 : productivité, charge, SAV
- Productivité : ≥65%=2, ≥50%=1, <50%=0
- Charge : 80-110%=2, 60-130%=1, sinon=0
- SAV : ≤3%=2, ≤8%=1, >8%=0
- Zone de confort ≥5pts, Optimisation 3-4pts, Tension <3pts

**4.8 Radar Chart (normalisation)**
- Productivité : directement `rate * 100`
- Qualité : inversé `(1 - min(savRate, 0.2) / 0.2) * 100`
- Charge : optimal à 100%, pénalisé aux extrêmes

**4.9 Détection absences**
- Scan de tous les créneaux/interventions pour keywords : arrêt, maladie, absence, congé
- Labels : "Arrêt maladie", "En arrêt", "En congé", "Absent"
- Exclusion des moyennes d'équipe

### 5. Statistiques d'équipe
- Moyenne productivité (hors absents)
- Moyenne charge (hors absents)
- Total SAV et total interventions
- Alertes : surcharge, sous-charge, SAV élevé

### 6. Fonctionnalités interactives
- Drawer SAV : validation/invalidation (table sav_validations), détection source
- Quick Edit : modification heures hebdo via contrat RH, type collaborateur
- Navigation mois par mois

### 7. Problèmes et limitations identifiés
- caGenerated toujours à 0 (jamais calculé dans le hook)
- Durée par défaut arbitraire (60-90min) quand pas de données
- Capacité calculée sur jours calendaires (pas ouvrés)
- Pas de prise en compte des jours fériés/congés dans la capacité
- Source slot : si aucune visite, fallback sur créneaux mais jamais les deux combinés
- Attribution temps : pas de division quand plusieurs techniciens sur un créneau

## Méthode de génération
- Script Python avec ReportLab (platypus pour mise en page multi-pages)
- Tables formatées pour les seuils et formules
- Diagramme ASCII de l'architecture
- Export vers `/mnt/documents/audit_module_performance.pdf`
- QA visuelle obligatoire (pdftoppm + inspection)

## Fichier produit
`/mnt/documents/audit_module_performance.pdf`

