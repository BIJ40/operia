# Manuel OPERIA — Guide Complet

> **Date** : 29 mars 2026
> **Version** : 1.0
> **Public** : Utilisateurs · Administrateurs · Développeurs

---

# PARTIE 1 — GUIDE UTILISATEUR (N0-N2)

---

## Chapitre 1 — Connexion et Profil

### 1.1 Se connecter

1. Accédez à `operiav2.lovable.app`
2. Entrez votre email et mot de passe
3. Cliquez sur "Se connecter"

### 1.2 Mon profil

Accessible via l'avatar en haut à droite :
- **Nom, prénom, email** : informations personnelles
- **Rôle** : votre niveau d'accès (affiché mais non modifiable)
- **Agence** : votre agence rattachée
- **Poste** : administratif, commercial ou technicien

### 1.3 Mot de passe oublié

1. Cliquez sur "Mot de passe oublié" sur la page de connexion
2. Entrez votre email
3. Un lien de réinitialisation est envoyé

---

## Chapitre 2 — Accueil / Dashboard

### 2.1 Page d'accueil

La page d'accueil affiche un dashboard adapté à votre rôle :
- **N2 (Dirigeant)** : KPI agence, alertes, actions à mener
- **N1 (Salarié)** : accès rapide aux modules délégués
- **N3+ (Réseau)** : vue réseau avec KPI globaux

### 2.2 Navigation par onglets

La navigation principale se fait via les onglets en haut de page :
- **Commercial** — Suivi clients, prospects, réalisations
- **Organisation** — RH, plannings, réunions, documents
- **Pilotage** — Statistiques, performance, KPI (N2+)
- **Médiathèque** — Documents, FAQ, exports
- **Support** — Guides, aide, ticketing

> 💡 Les onglets grisés indiquent des modules non disponibles dans votre plan. Contactez votre administrateur.

---

## Chapitre 3 — Support

### 3.1 Guides (Help! Academy)

**Module** : `support.guides` · **Accès** : Tous les utilisateurs

L'Help! Academy contient des guides structurés par catégorie :
- **Apogée** : utilisation du logiciel ERP
- **HelpConfort** : procédures métier
- **Apporteurs** : gestion des prescripteurs
- **FAQ** : questions fréquentes

**Fonctionnalités** :
- Recherche par mots-clés
- Navigation par sections
- Recherche sémantique IA (Helpi)

### 3.2 Aide en ligne (Helpi)

**Module** : `support.aide_en_ligne` · **Accès** : Tous les utilisateurs

Helpi est un assistant IA qui recherche dans les guides pour répondre à vos questions.

**Usage** :
1. Cliquez sur l'icône Helpi (bulle de chat)
2. Posez votre question en langage naturel
3. Helpi cherche dans les guides et vous propose des réponses contextuelles

### 3.3 Ticketing

**Module** : `support.ticketing` · **Accès** : Assignation individuelle

Le module de ticketing permet de signaler des bugs, demander des évolutions ou contacter le support.

**Fonctionnalités** :
- **Kanban** : vue tableau avec colonnes de statut
- **Création** : formulaire de signalement avec pièces jointes
- **Suivi** : historique, commentaires, échanges support
- **Tags** : catégorisation (module, priorité, impact)
- **Fil de discussion** : échanges avec l'équipe support

---

## Chapitre 4 — Pilotage (N2+)

### 4.1 Statistiques (StatIA)

**Module** : `pilotage.statistiques` · **Accès** : N2+ · **Plan** : STARTER (général), PRO (avancé)

StatIA est le moteur central de métriques d'OPERIA.

#### Onglets statistiques

| Onglet | Plan | Contenu |
|--------|------|---------|
| **Général** | STARTER+ | CA global, évolution mensuelle, comparaison N-1 |
| **Apporteurs** | PRO | CA par prescripteur, scoring, top apporteurs |
| **Techniciens** | PRO | CA par technicien, productivité, comparatif |
| **Univers** | PRO | Répartition par univers métier (chauffage, plomberie…) |
| **SAV** | PRO | Taux SAV, évolution, détail par technicien |
| **Prévisionnel** | PRO | Projections basées sur l'historique |
| **Recouvrement** | PRO | Encours clients, délais de paiement |
| **Trésorerie** | PRO | Flux de trésorerie, prévisions |

#### StatIA Builder (N2+)

Création de métriques personnalisées :
1. Choisir une mesure (CA, SAV, devis…)
2. Définir les dimensions (technicien, univers, période…)
3. Appliquer des filtres
4. Sauvegarder et retrouver sur le dashboard

### 4.2 Performance terrain

**Module** : `pilotage.performance` · **Accès** : N2+ · **Plan** : STARTER+

Analyse de l'efficacité des techniciens :
- **Taux de charge** : heures planifiées vs disponibles
- **Productivité** : heures facturées vs payées
- **Matching** : visites terrain ↔ créneaux planifiés
- **Alertes** : techniciens sous/sur-chargés

### 4.3 Actions à mener

**Module** : `pilotage.actions` · **Accès** : N2+

Liste des actions identifiées par les KPI :
- Relances clients impayés
- Devis en attente
- Alertes performance

### 4.4 Résultat / Rentabilité

**Module** : `pilotage.resultat`, `pilotage.rentabilite` · **Accès** : N2+

- **Résultat** : compte de résultat simplifié de l'agence
- **Rentabilité** : analyse par dossier (coûts, marges, snapshots versionnés)

### 4.5 Trésorerie

**Module** : `pilotage.tresorerie` · **Accès** : N2+

Suivi des flux de trésorerie avec connexion bancaire (Bridge API).

### 4.6 Cartes (Maps)

**Module** : `pilotage.maps` · **Accès** : N2+

Cartes Mapbox affichant :
- Localisation des RDV/interventions
- Zones d'intervention
- Répartition géographique du CA

### 4.7 Parc véhicules & EPI

**Module** : `pilotage.parc` · **Accès** : N2+

Gestion du parc :
- Inventaire véhicules
- Suivi EPI (équipements de protection)
- Accusés de réception EPI (PDF auto-générés)

---

## Chapitre 5 — Commercial

### 5.1 Suivi clients

**Module** : `commercial.suivi_client` · **Accès** : N1+ · **Type** : Option agence

Portail de suivi client avec :
- Fiches clients détaillées
- Historique interventions
- Documents générés
- Lien de suivi partageable

### 5.2 Comparateur

**Module** : `commercial.comparateur` · **Accès** : N1+ · **Plan** : STARTER+

Comparaison des performances entre périodes ou entre techniciens.

### 5.3 Prospects (CRM)

**Module** : `commercial.prospects` · **Accès** : N1+ · **Plan** : STARTER+

CRM intégré :
- Pipeline 6 états (nouveau → gagné/perdu)
- Import Excel
- Scoring adaptatif
- Historique contacts

### 5.4 Réalisations (AVAP)

**Module** : `commercial.realisations` · **Accès** : N1+ · **Plan** : PRO

Galerie avant/après pour les réalisations :
- Upload photos avant/après
- Catégorisation par univers
- Partage via lien ou webhook

### 5.5 Signature email

**Module** : `commercial.signature` · **Accès** : N1+ · **Plan** : PRO (ou option STARTER)

Générateur de signature email professionnelle avec logo agence.

### 5.6 Social media

**Module** : `commercial.social` · **Accès** : N1+

Suggestions de posts réseaux sociaux (IA) + génération de visuels.

---

## Chapitre 6 — Organisation

### 6.1 Salariés / RH

**Module** : `organisation.salaries` · **Accès** : N2+

- Fiches salariés
- Documents RH (contrats, certificats)
- Génération de lettres (DocGen)
- Alertes expirations (certificats médicaux, habilitations)

### 6.2 Plannings

**Module** : `organisation.plannings` · **Accès** : N2+

- Plannings techniciens (vue semaine/mois)
- Planning augmenté (IA) : suggestions d'optimisation
- Indisponibilités

### 6.3 Réunions

**Module** : `organisation.reunions` · **Accès** : N2+

Organisation et suivi des réunions d'agence.

### 6.4 Documents légaux

**Module** : `organisation.documents_legaux` · **Accès** : N2+

Documents administratifs de l'agence (assurances, certifications, etc.).

### 6.5 Zones de déplacement

**Module** : `organisation.zones` · **Accès** : N2+

Définition des zones d'intervention par commune (code INSEE).

### 6.6 Médiathèque

**Modules** : `mediatheque.consulter`, `mediatheque.documents`, `mediatheque.faq`, `mediatheque.exports`

- Consultation de documents partagés
- Upload/gestion de documents
- FAQ centralisée
- Export de données

---

## Chapitre 7 — Apporteurs (Pack Relations)

**Module** : `organisation.apporteurs` · **Type** : Option agence (Pack Relations)

### 7.1 Gestion des apporteurs

- Liste des prescripteurs/apporteurs
- Fiches détaillées avec scoring
- Statistiques par apporteur

### 7.2 Portail apporteur

Interface externe accessible par les apporteurs via OTP :
- Suivi de leurs dossiers
- Échanges avec l'agence
- Planning des interventions
- Nouvelles demandes

---

## Chapitre 8 — Recherche unifiée

**Raccourci** : `Cmd+K` (Mac) ou `Ctrl+K` (Windows)

Recherche globale dans :
- Guides
- Tickets
- Utilisateurs (admin)
- Documents

---

# PARTIE 2 — GUIDE ADMINISTRATEUR (N2-N6)

---

## Chapitre 9 — Gestion d'équipe (N2)

### 9.1 Créer un utilisateur

1. Accédez à l'onglet "Organisation" → "Salariés"
2. Cliquez sur "Ajouter un collaborateur"
3. Remplissez : nom, prénom, email, poste (administratif/commercial/technicien)
4. Le système applique automatiquement le preset de modules correspondant au poste
5. Un email d'invitation est envoyé

**Règles** :
- Un N2 ne peut créer que des N1 ou N0
- Uniquement dans son agence
- Le poste détermine les modules par défaut

### 9.2 Gérer les droits (Délégation N2 → N1)

**Interface** : "Droits équipe" dans la fiche collaborateur

L'interface affiche des tuiles colorées par domaine :
- **Pilotage** (bleu) — KPI, statistiques
- **Commercial** (vert) — Suivi, prospects
- **Organisation** (orange) — RH, plannings
- **Support** (violet) — Guides, aide

Chaque tuile contient des chips cliquables pour activer/désactiver les modules.

**Règles de délégation** :
- Vous ne pouvez déléguer que les modules de votre enveloppe agence (plan + options)
- Un module désactivé pour le collaborateur = pas d'accès
- Bouton "Réinitialiser au profil" pour revenir aux valeurs par défaut du poste

### 9.3 Presets poste

| Poste | Modules par défaut |
|-------|-------------------|
| **Administratif** | Salariés, Plannings, Docs légaux, Médiathèque, Guides, Aide |
| **Commercial** | Suivi client, Comparateur, Prospects, Réalisations, Guides, Aide |
| **Technicien** | Guides, Aide |

---

## Chapitre 10 — Administration agence

### 10.1 Profil agence

Informations de l'agence : nom, adresse, contact, logo, configuration.

### 10.2 Abonnement / Plan

Votre agence est sur l'un des deux plans :

| Plan | Inclus |
|------|--------|
| **STARTER (Essentiel)** | Modules socle (dashboard, stats générales, CRM, organisation) |
| **PRO (Performance)** | Tout STARTER + stats avancées (7 modules), réalisations, signature, corbeille |

### 10.3 Options SaaS

Options activables en supplément :
- **Pack Relations** : portail apporteurs, gestion prescripteurs
- **Suivi Client** : portail client avec paiement en ligne
- **Signature** : disponible en option pour les plans STARTER

---

## Chapitre 11 — Réseau Franchiseur (N3-N4)

**Interface de rôle** — accessible par le rôle global, pas par le système de modules.

### 11.1 Dashboard réseau (N3+)

Vue d'ensemble de toutes les agences du réseau :
- KPI agrégés (CA réseau, nombre d'interventions)
- Comparatifs inter-agences
- Alertes réseau

### 11.2 Gestion agences (N3+)

- Liste des agences
- Fiches détaillées
- Visites animateur

### 11.3 Redevances (N4+)

Calcul et suivi des redevances :
- Configuration par tranches de CA
- Calculs mensuels automatiques
- Historique et export

### 11.4 KPI réseau (N3+)

Statistiques réseau avec comparatifs et classements.

---

## Chapitre 12 — Administration plateforme (N4-N6)

### 12.1 Gestion utilisateurs (N4+)

- Liste de tous les utilisateurs du réseau
- Création/modification/suppression
- Changement de rôle (plafonnement N-1)
- Attribution de modules individuels

### 12.2 Modules & Permissions (N4+)

- Vue modules déployés
- Activation/désactivation par agence
- Overrides individuels

### 12.3 Contenu (N4+)

- Gestion des guides Help! Academy
- Annonces prioritaires
- FAQ

### 12.4 Offres (N4+)

- Plans STARTER / PRO
- Options agence
- Configuration commerciale

### 12.5 Système (N5+)

- Health check (7 catégories)
- Sync Apogée (logs, relance manuelle)
- Export données
- Cache IA

---

# PARTIE 3 — GUIDE DÉVELOPPEUR

---

## Chapitre 13 — Setup local (30 min)

```bash
# 1. Cloner le dépôt
git clone <repo-url> && cd operia

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
# Le .env est auto-populé avec les variables Supabase

# 4. Lancer le serveur de développement
npm run dev
# → http://localhost:5173

# 5. Build production
npm run build
```

### Prérequis

- Node.js 20+
- npm ou bun
- Accès au projet Supabase

---

## Chapitre 14 — Architecture code

### Structure globale

```
src/
├── routes/         # 11 fichiers de routes
├── pages/          # Composants page
├── components/     # UI réutilisable (shadcn + custom)
├── hooks/          # Logique réutilisable
├── contexts/       # État global (Auth, Permissions)
├── permissions/    # Moteur de permissions
├── config/         # Configuration métier
├── types/          # Types TypeScript
├── services/       # Services métier
├── repositories/   # Accès données
├── statia/         # Moteur StatIA
├── modules/        # Modules isolés (performance, interventions)
└── [domaines]/     # Code métier par domaine
```

### Patterns clés

- **Guards** : `RoleGuard`, `ModuleGuard`, `FeatureGuard`, `PlanGuard`
- **Context** : `AuthContext` (auth + profil), `PermissionsContext` (modules)
- **React Query** : toujours pour les données serveur (pas de useState pour les API)
- **Repository** : abstraction d'accès données dans `src/repositories/`

---

## Chapitre 15 — Ajouter un module

### Checklist

1. **Définir le module** dans `src/types/modules.ts` (MODULE_DEFINITIONS)
2. **Ajouter au registre DB** : INSERT dans `module_registry`
3. **Ajouter au plan** : INSERT dans `plan_tier_modules` si via_plan
4. **Créer les composants** dans le domaine approprié
5. **Protéger la route** avec `ModuleGuard`
6. **Ajouter l'onglet** dans `UnifiedWorkspace`
7. **Mettre à jour la doc** : `MODULES_CATALOG.md`

### Exemple

```tsx
// Route protégée
<ModuleGuard module="commercial.nouveau_module">
  <NouveauModulePage />
</ModuleGuard>

// Vérification programmatique
const { hasModule } = usePermissions();
if (hasModule('commercial.nouveau_module')) { ... }
```

---

## Chapitre 16 — Ajouter une Edge Function

### Structure

```
supabase/functions/ma-fonction/
└── index.ts
```

### Template minimal

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Auth
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  );

  // Logique...

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Règles

- `verify_jwt = true` sauf webhooks
- Service role uniquement pour les opérations admin
- Rate limiting sur les fonctions publiques
- Logging structuré (Sentry)

---

## Chapitre 17 — Migrations DB

### Créer une migration

Utiliser l'outil de migration Lovable :
1. Écrire le SQL
2. L'outil crée le fichier dans `supabase/migrations/`
3. Tester en preview
4. Déployer

### Règles

- Ne JAMAIS modifier une migration existante
- Ne JAMAIS faire `ALTER DATABASE postgres`
- RLS OBLIGATOIRE sur chaque nouvelle table
- Fonctions SECURITY DEFINER pour éviter la récursion RLS

---

## Chapitre 18 — Permissions : comment ça marche

### Vue rapide

```
Utilisateur se connecte
  → AuthContext charge le profil (global_role, agency_id)
  → useEffectiveModules appelle RPC get_user_effective_modules
  → PermissionsContext expose hasModule() et hasModuleOption()
  → Guards protègent routes et composants
```

### Cascade de résolution (RPC)

1. **Bypass N5+** → tous les modules
2. **Modules via plan** → plan_tier_modules WHERE tier_key = plan agence
3. **Modules hors plan** → module_registry WHERE required_plan = 'NONE'
4. **Overrides** → user_modules (validation clé + contrainte plan)
5. **Auto-grant sections** → parent accordé si enfant accordé

### Vérifier l'accès

```typescript
// Dans un composant
const { hasModule, hasModuleOption } = usePermissions();

// Module
if (hasModule('pilotage.agence')) { ... }

// Option
if (hasModuleOption('ticketing.kanban')) { ... }

// Guard JSX
<ModuleGuard module="pilotage.agence">
  <MonComposant />
</ModuleGuard>
```

---

## Chapitre 19 — API Apogée

### Proxy

Toutes les requêtes Apogée passent par `proxy-apogee` :

```typescript
const response = await supabase.functions.invoke('proxy-apogee', {
  body: { endpoint: 'apiGetProjects', params: { agencySlug } }
});
```

### Données disponibles

| Endpoint | Données |
|----------|---------|
| `apiGetProjects` | Projets/dossiers (bulk) |
| `apiGetProjectByRef` | Détail dossier (enrichissement) |
| `apiGetFactures` | Factures |
| `apiGetInterventions` | Interventions |
| `apiGetDevis` | Devis |
| `apiGetCreneaux` | Créneaux planning |

### Règle d'or

**Enrichissement à la demande = action utilisateur explicite uniquement.** Jamais dans les dashboards, cartes ou recherche globale.

---

## Chapitre 20 — Tests

### Lancer les tests

```bash
# Tests unitaires
npm run test

# Tests spécifiques
npx vitest run src/modules/performance
```

### Écrire un test

```typescript
import { describe, it, expect } from 'vitest';

describe('MonMoteur', () => {
  it('calcule correctement', () => {
    const result = compute(input);
    expect(result).toBe(expected);
  });
});
```

---

## Chapitre 21 — Deploy

### Lovable Cloud

Push → build automatique → CDN. Rien à faire.

### Docker

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg VITE_SUPABASE_PROJECT_ID=... \
  -t operia .

docker run -p 80:80 operia
```

---

# ANNEXES

## A — Glossaire

| Terme | Définition |
|-------|-----------|
| **N0-N6** | Niveaux de rôle (base_user → superadmin) |
| **Module** | Fonctionnalité permissionnable (ex: pilotage.agence) |
| **Plan** | Forfait agence (STARTER ou PRO) |
| **Option** | Module activable en supplément (Pack Relations…) |
| **Override** | Surcharge de droits individuelle |
| **Délégation** | Attribution d'un module par un N2 à un N1 |
| **Preset** | Modules par défaut selon le poste |
| **Guard** | Composant qui protège une route/fonctionnalité |
| **RLS** | Row Level Security (sécurité niveau ligne PostgreSQL) |
| **RPC** | Remote Procedure Call (fonction SQL appelée depuis le client) |
| **Edge Function** | Fonction serveur Deno exécutée à la périphérie |
| **StatIA** | Moteur de statistiques centralisé |
| **Shadow Mirror** | Tables miroir des données Apogée |

## B — Rôles et niveaux

| Niveau | Rôle | Qui | Capacités clés |
|:---:|------|-----|---------------|
| N0 | base_user | Technicien terrain | Guides, aide |
| N1 | franchisee_user | Salarié agence | Modules par délégation |
| N2 | franchisee_admin | Dirigeant agence | Plan agence + délégation N1 |
| N3 | franchisor_user | Animateur réseau | Interface franchiseur (lecture) |
| N4 | franchisor_admin | Direction réseau | Gestion agences + redevances |
| N5 | platform_admin | Admin plateforme | Bypass total |
| N6 | superadmin | Super-admin | Bypass total + admin |

## C — Plans

| | STARTER | PRO |
|---|:---:|:---:|
| Dashboard | ✅ | ✅ |
| Stats générales | ✅ | ✅ |
| Stats avancées (7) | ❌ | ✅ |
| Réalisations | ❌ | ✅ |
| Signature | ❌ | ✅ |
| Corbeille | ❌ | ✅ |
| Tout le reste | ✅ | ✅ |
