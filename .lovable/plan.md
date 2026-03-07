

# Etat des lieux et reformulation du systeme de permissions

## Ce qui existe aujourd'hui

Il y a **3 systemes independants** qui ne se parlent pas bien :

### 1. Feature Flags (table `feature_flags` en BDD)
L'outil "Modules" dans Admin > Plateforme. C'est une table en base avec 53 entrees, chacune avec un statut de dev (operationnel, en cours, a faire, desactive) et un toggle actif/inactif. **Probleme** : cette liste est geree manuellement en base, elle n'est PAS alignee avec `MODULE_DEFINITIONS` dans le code. C'est un inventaire de fonctionnalites, pas un vrai systeme de permissions.

### 2. MODULE_DEFINITIONS (code TypeScript)
La source de verite pour les permissions : 15 modules avec leurs options. C'est ce qui controle reellement l'acces aux onglets dans `UnifiedWorkspace.tsx`.

### 3. Plans (table `plan_tiers` + `plan_tier_modules`)
Matrice plan x module. Seulement au niveau module, pas au niveau option.

**Resultat** : Les feature flags listent des choses qui ne sont pas des modules (ex: `agence.veille_apporteurs` qui est un sous-sous-module). Les plans ne gèrent pas les options. Les permissions utilisateur (`UserModulesTab`) utilisent encore des maps hardcodees legacy. Rien n'est coherent.

## Ce que tu veux (reformulation structuree)

### Principe : l'arbre des onglets = l'arbre des permissions

La plateforme a des onglets principaux, des sous-onglets, et des sous-sous-onglets. L'arbre des permissions doit etre **exactement le meme arbre**, a tous les niveaux de profondeur.

```text
ARBRE DE LA PLATEFORME (= ARBRE DES PERMISSIONS)
├── Accueil (toujours visible)
├── Stats
│   ├── Stats Hub
│   └── Exports
├── Salaries (RH)
│   ├── Gestionnaire
│   └── Admin RH
├── Outils
│   ├── Parc
│   │   ├── Vehicules
│   │   ├── EPI
│   │   └── Equipements
│   ├── Apporteurs
│   │   ├── Consulter
│   │   └── Gerer
│   ├── Plannings
│   ├── Reunions
│   └── Prospection (si deploye)
│       ├── Suivi client
│       ├── Comparateur
│       └── Veille
├── Documents
│   ├── Consulter
│   ├── Gerer
│   └── Vider corbeille
├── Guides
│   ├── Apogee
│   ├── Apporteurs
│   ├── HelpConfort
│   └── FAQ
├── Ticketing
│   ├── Kanban
│   ├── Creer
│   ├── Gerer
│   └── Import
├── Aide
│   ├── Utilisateur
│   └── Agent
└── Admin (N5+ uniquement)
```

### Couche 1 : Plans (Basique / Pro)

Chaque noeud de l'arbre a une attribution de plan :
- **Cocher le titre** = propager Basique ou Pro a tous les enfants
- **Aller dans les branches** = overrider un enfant specifique (ex: "Stats Exports" = Pro meme si "Stats" = Basique)
- Un module actif est **minimum Pro** (ou Basique si explicitement marque)

### Couche 2 : Permissions par role

Independamment du plan, certains roles n'ont pas acces a certains modules :
- Un "partenaire externe" ne voit pas les modules RH meme si l'agence est en plan Pro
- Un "utilisateur agence" de base ne voit pas l'admin
- Ca **overwrite** le plan : le plan dit ce qui est *disponible*, le role dit ce qui est *accessible*

### Couche 3 : Override individuel par utilisateur

Dans le profil de chaque utilisateur, on retrouve **l'arbre complet** avec la possibilite d'activer/desactiver n'importe quel noeud. Ca prend le dessus sur tout (plan + role).

### Cascade d'attribution

Quand on attribue "Pro" a une agence :
1. Tous les modules Pro deviennent disponibles
2. **MAIS** filtre par les permissions du role de chaque utilisateur
3. **PUIS** les overrides individuels prennent le dessus

## Plan d'implementation

C'est un chantier tres important qui touche :
- `src/types/modules.ts` : ajouter `deployed`, `category`, restructurer en arbre
- `PlansManagerView.tsx` : afficher l'arbre avec propagation parent→enfants, colonnes Basique/Pro
- `UserModulesTab.tsx` : refonte complete, meme arbre que les plans
- Feature Flags (`AdminFeatureFlags.tsx`) : fusionner avec `MODULE_DEFINITIONS` ou supprimer
- `useEffectiveModules` / `AuthContext` : integrer la cascade Plan → Role → Override

### Etape 1 : Consolider la source unique
Fusionner feature flags et MODULE_DEFINITIONS. Ajouter `deployed: boolean` et `planTier: 'STARTER' | 'PRO' | null` directement dans la definition. Supprimer les modules WIP (planning_augmente) de la visibilite.

### Etape 2 : Refondre PlansManagerView
Afficher l'arbre en escalier avec 2 colonnes (Basique/Pro). Cocher un parent propage aux enfants. Pouvoir overrider chaque enfant.

### Etape 3 : Refondre UserModulesTab
Meme arbre que les plans. Montrer ce qui vient du plan (lecture seule) vs ce qui est override (editable). Filtrer par role.

### Etape 4 : Integrer la cascade dans le runtime
`useEffectiveModules` doit calculer : Plan agence → filtre role → override utilisateur.

Souhaites-tu que je commence par l'etape 1 (consolider la source unique) ?

