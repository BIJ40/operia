# 🎯 AUDIT PRODUIT SaaS — 7 Mars 2026

**Auditeur** : Expert Produit SaaS (IA)  
**Version** : V0.9.1  
**Scope** : Navigation, modules, permissions, flux UX, cohérence fonctionnelle

---

## 📊 PRODUCT SCORE : 6.5 / 10

| Critère | Note | Poids | Commentaire |
|---------|------|-------|-------------|
| Cohérence navigation | 6/10 | 20% | Workspace unifié solide mais "Outils" fourre-tout |
| Modèle de permissions | 7/10 | 15% | Bien structuré mais complexité cachée |
| Friction utilisateur | 5/10 | 20% | Onglets Guides inactifs, FAQ vide, pas de onboarding progressif |
| Cohérence modules | 7/10 | 15% | MODULE_DEFINITIONS aligné UI, mais des orphelins |
| Fonctionnalités manquantes | 6/10 | 15% | Plusieurs "à venir", modules non déployés visibles |
| Clarté des flux | 7/10 | 15% | Flux principaux OK, mais chemins secondaires confus |

---

## 1. ARCHITECTURE PRODUIT

### 1.1 Interface unifiée — UnifiedWorkspace

Le produit est structuré autour d'un workspace unifié à onglets :

```
┌──────────────────────────────────────────────────────────┐
│  Accueil │ Stats │ Salariés │ Outils │ Documents │       │
│  Guides │ Ticketing │ Aide │ Admin │ TEST │ Profil ▼     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Sous-onglets niveau 2 (Pill tabs)                      │
│   ├── Outils: Actions, Apporteurs, Administratif,       │
│   │           Parc, Performance, Commercial              │
│   ├── Guides: Apogée, Apporteurs, HelpConfort, FAQ      │
│   ├── Admin: Accès, Réseau, IA, Contenu, Ops, Plateforme│
│   └── etc.                                               │
│                                                          │
│   Sous-onglets niveau 3 (Folder tabs)                    │
│   ├── Outils > Administratif: Réunions, Plannings, Docs │
│   ├── Outils > Parc: Véhicules, EPI, Outillage          │
│   └── etc.                                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Positif** : Navigation drag-and-drop, URL routing `?tab=XXX`, synchronisation état session.

### 1.2 Système de rôles (7 niveaux)

```
N0 — base_user       : Visiteur (accès minimal)
N1 — franchisee_user : Technicien/Assistant (guides + aide)
N2 — franchisee_admin: Dirigeant agence (tout l'onglet agence)
N3 — franchisor_user : Animateur réseau (vue franchiseur)
N4 — franchisor_admin: Directeur réseau
N5 — platform_admin  : Support N3 (admin plateforme)
N6 — superadmin      : Dieu
```

### 1.3 Système de modules (16 modules)

```
16 modules × options par module = ~50 permissions granulaires
Cascade: Plan (Starter/Pro) → Rôle global → Overrides utilisateur
```

---

## 2. PROBLÈMES DE COHÉRENCE NAVIGATION

### 2.1 🔴 L'onglet "Outils" est un fourre-tout incohérent

L'onglet "Outils" agrège 6 sous-onglets qui n'ont **aucun lien fonctionnel** entre eux :

| Sous-onglet | Domaine réel | Cohérence avec "Outils" |
|------------|-------------|------------------------|
| Actions | Pilotage agence | ❌ Devrait être dans Accueil/Dashboard |
| Apporteurs | CRM / Partenaires | ❌ Module métier complet |
| Administratif | RH / Bureau | ❌ Mélange réunions + plannings + docs admin |
| Parc | Flotte / EPI | ⚠️ Outil mais distinct |
| Performance | KPIs techniciens | ❌ Devrait être dans Stats |
| Commercial | Prospection | ❌ Module métier complet |

**Impact** : Un dirigeant d'agence qui cherche "Apporteurs" ne pense pas "Outils". Un technicien qui cherche son planning ne pense pas "Outils > Administratif > Plannings".

**Recommandation** : Éclater "Outils" en onglets dédiés ou renommer en "Gestion" avec sous-catégorisation claire.

### 2.2 🔴 Onglets Guides avec contenu désactivé

```tsx
// GuidesTabContent.tsx — Lignes 20-22
{ id: 'apporteurs', label: 'Apporteurs', icon: Users, disabled: true },
{ id: 'helpconfort', label: 'HelpConfort', icon: Building2, disabled: true },
```

Deux guides sur quatre sont **hardcodés disabled**. L'onglet FAQ affiche "à venir".

**Impact** : Un utilisateur voit 4 onglets mais seul 1 fonctionne (Apogée). C'est une **déception produit majeure** — 75% du contenu guides est inaccessible.

**Recommandation** : Masquer les onglets disabled ou mettre un tag "Bientôt" visible.

### 2.3 🟠 Onglet "TEST" visible en production

```tsx
// UnifiedWorkspace.tsx — Ligne 168
{ id: 'test', label: 'TEST', icon: FlaskConical },
```

L'onglet TEST est visible pour **tous les utilisateurs** (pas de `requiresOption`), et affiche un placeholder. Il manque un guard `adminOnly` ou un feature flag.

### 2.4 🟠 Profil en dropdown, pas en onglet

Le profil est un **faux onglet** (dropdown menu) visuellement identique aux autres onglets. L'utilisateur clique en s'attendant à naviguer vers un onglet, mais un dropdown apparaît. C'est un pattern anti-convention.

Les liens Profile, Agence, Changelog redirigent vers des pages `/profile`, `/agence`, `/changelog` **hors du workspace** — perte de contexte.

### 2.5 🟠 Franchiseur = interface complètement différente

```tsx
// UnifiedWorkspace.tsx — Ligne 360
if (isFranchiseur && !realIsPlatformAdmin) {
  return <FranchiseurView />;
}
```

Les utilisateurs N3+ (animateur réseau, directeur) voient une **interface totalement différente** sans les onglets habituels. Ils ne peuvent pas accéder aux fonctionnalités agence standard. C'est un choix de design fort qui peut :
- ✅ Simplifier la vue réseau
- ❌ Bloquer l'accès aux guides, aide, ticketing

### 2.6 🟡 Navigation admin à 6 sous-niveaux

L'Admin a **3 niveaux de profondeur** : Onglet Admin → Sous-onglet (Accès, Réseau, IA, Contenu, Ops, Plateforme) → Vue spécifique. Avec des URL comme :
```
/?tab=admin&adminTab=contenu&adminView=faq
```

C'est acceptable pour un admin N5+, mais la complexité URL est un signe de sur-imbrication.

---

## 3. FRICTION UTILISATEUR

### 3.1 🔴 Pas de onboarding progressif

Le `WelcomeWizardGate` existe mais est un wizard unique au premier login. Il n'y a **aucune découverte progressive** :
- Pas de tooltips contextuels
- Pas de guided tour
- Pas de checklist de première utilisation
- Pas de "vous n'avez pas encore configuré X"

**Impact** : Un utilisateur N1 (technicien) arrive sur un dashboard avec des KPIs qu'il ne comprend pas et des onglets qu'il ne peut pas utiliser.

### 3.2 🔴 Pas de page "vide" pour modules non configurés

Quand un module est activé mais sans données (ex: Parc sans véhicules, Apporteurs sans partenaires), l'utilisateur voit **une page vide** ou un tableau vide. Il n'y a pas de :
- Empty state avec illustration
- Call-to-action "Ajoutez votre premier véhicule"
- Lien vers la documentation

### 3.3 🟠 Double système de navigation (routes + tabs)

Le produit a **deux systèmes de navigation parallèles** :
1. **Tab system** : `?tab=stats`, `?tab=outils` (UnifiedWorkspace)
2. **Route system** : `/rh/planning`, `/projects/kanban` (React Router)

Les routes standalone sont gardées pour "cas spéciaux" mais créent de la confusion :
- `/rh/planning` → page standalone avec layout minimal
- `?tab=outils&mainTab=administratif&subTab=plannings` → même planning dans le workspace
- L'utilisateur peut avoir 2 URL pour le même contenu

### 3.4 🟠 Redirections massives dans admin.routes.tsx

**41 redirections** dans `admin.routes.tsx` qui renvoient toutes vers `/?tab=admin&adminTab=X&adminView=Y`. Cela signifie que des liens existants (bookmarks, documentation) pointent vers des URLs legacy. Chaque URL `/admin/X` est interceptée et redirigée.

**Impact** : Un utilisateur avec un bookmark `/admin/helpi` est redirigé silencieusement. Le browser URL change. C'est invisible côté UX mais fragile.

### 3.5 🟡 Drag-and-drop sur les onglets : utile ou gadget ?

La possibilité de réordonner les onglets par drag-and-drop est un **nice-to-have** qui ajoute de la complexité (DnD context, session storage, auto-repair de l'ordre, etc.) pour un gain marginal. Dans un SaaS métier, les utilisateurs n'ont généralement pas besoin de réordonner leur navigation.

---

## 4. COMPLEXITÉ PERMISSIONS

### 4.1 Architecture permissions — Triple cascade

```
Plan d'agence (Starter/Pro)
  └─→ module_registry (DB) + plan_tier_modules (DB)
        └─→ RPC get_user_effective_modules()
              └─→ user_modules (overrides individuels)
                    └─→ AuthContext.enabledModules (client)
                          └─→ useEffectiveModules (hook)
                                └─→ hasModule() / hasModuleOption()
                                      └─→ ModuleGuard (composant)
                                            └─→ RoleGuard (composant)
```

**7 niveaux** de vérification pour savoir si un utilisateur peut voir un bouton. C'est architecturalement propre mais **opaque pour l'admin** :

> "Pourquoi l'utilisateur X ne voit pas l'onglet Y ?"

Réponse possible : Plan agence, module désactivé dans registry, min_role trop élevé, pas d'override user_modules, ou RoleGuard bloquant. Il n'y a **aucun outil de diagnostic** pour répondre à cette question.

### 4.2 🔴 Pas de page "Accès refusé" contextuelle

Quand un onglet est inaccessible, il est soit :
- Masqué (pour l'onglet Admin)
- Grisé visuellement (pour les autres)

Mais il n'y a **aucune explication** : "Cet onglet nécessite le plan Pro" ou "Contactez votre administrateur pour activer ce module". L'utilisateur voit un onglet grisé sans savoir pourquoi.

### 4.3 🟠 Incohérence module "prospection" (deployed: false)

Le module `prospection` est marqué `deployed: false` dans MODULE_DEFINITIONS, mais le sous-onglet "Commercial" est visible dans Outils :

```tsx
// DiversTabContent.tsx — Ligne 66
{ id: 'prospection', label: 'Commercial', icon: Target, accent: 'orange', requiresModule: 'prospection' },
```

Si le module est non déployé, le sous-onglet ne devrait jamais apparaître. Mais il peut apparaître via un `user_modules` override.

### 4.4 🟡 Nommage incohérent modules vs UI

| ModuleKey | Label dans MODULE_DEFINITIONS | Label dans l'UI |
|-----------|-------------------------------|-----------------|
| `divers_apporteurs` | "Apporteurs" | "Apporteurs" (dans Outils) |
| `divers_plannings` | "Plannings" | Sous-onglet "Administratif" |
| `divers_reunions` | "Réunions" | Sous-onglet "Administratif" |
| `divers_documents` | "Documents" | Onglet "Documents" (séparé) |
| `prospection` | "Commercial" | "Commercial" (dans Outils) |
| `agence` | "Mon agence" | "Actions" (dans Outils) |

Le préfixe `divers_` est un vestige qui ne correspond plus à l'UI. `divers_documents` est devenu un onglet top-level "Documents" mais garde son nom legacy.

---

## 5. FONCTIONNALITÉS MANQUANTES

### 5.1 Manques critiques pour un SaaS

| Fonctionnalité | Statut | Impact |
|---------------|--------|--------|
| **Notifications in-app** | Partiel (unified_notifications table, pas d'UI bell) | 🔴 Pas de notification temps réel |
| **Recherche globale** | Module `unified_search` existe, pas d'UI visible | 🔴 Impossible de chercher un collaborateur/ticket |
| **Export PDF/Excel global** | Éparpillé par module | 🟠 Pas d'export unifié |
| **Mobile responsive** | Non audité, mais workspace à onglets inadapté mobile | 🔴 Inutilisable sur téléphone |
| **Changelog intégré** | Page `/changelog` standalone | 🟡 Hors du workspace |
| **Multi-langue** | Aucun système i18n | 🟡 Bloquant pour internationalisation |
| **Tableau de bord personnalisable** | Non | 🟠 Tous voient le même dashboard |
| **Mode hors-ligne** | PWA avec Service Worker, mais pas de sync offline | 🟡 SW pour cache uniquement |
| **Audit trail utilisateur** | `activity_log` existe, pas d'UI pour l'utilisateur | 🟡 Admin only |
| **Webhooks / Intégrations** | Aucun | 🟠 Pas d'intégration externe possible |

### 5.2 Modules "fantômes" (déclarés mais non fonctionnels)

| Module | Statut | Code UI |
|--------|--------|---------|
| `planning_augmente` | `deployed: false` | Aucun UI visible |
| `prospection` | `deployed: false` | UI dans Outils > Commercial |
| Guide Apporteurs | `disabled: true` | Onglet grisé visible |
| Guide HelpConfort | `disabled: true` | Onglet grisé visible |
| FAQ | Placeholder "à venir" | Onglet actif mais vide |

---

## 6. FLUX UTILISATEUR CASSÉS OU CONFUS

### 6.1 🔴 Flux N1 (Technicien) — Expérience dégradée

Un technicien (N1) arrive et voit :
1. **Accueil** → DemoAccueilContent (contenu de démo, pas ses données réelles)
2. **Guides** → Apogée OK, 3 autres onglets disabled/vides
3. **Ticketing** → Si module activé, fonctionne
4. **Aide** → Si module activé, fonctionne

Le technicien **n'a pas accès** à son planning (`outils > administratif > plannings` nécessite `franchisee_admin`). C'est un **blocage fonctionnel** : le technicien ne peut pas voir son planning dans l'application.

### 6.2 🔴 Flux "Demande de document RH" — Incohérence

Un collaborateur peut demander un document via le module RH (`document_requests`). Mais :
- La demande est créée dans le workspace
- La notification arrive dans `rh_notifications` 
- Le traitement se fait dans `?tab=salaries`
- Le document résultat va dans `media_folders`

4 systèmes différents pour un seul flux. L'utilisateur ne sait pas **où** suivre sa demande.

### 6.3 🟠 Flux Apporteur — Portail séparé

Les apporteurs ont leur propre système d'auth (`apporteur_managers`, `apporteur_sessions`, `apporteur_otp_codes`) avec un portail séparé. Cela signifie :
- Deux systèmes d'authentification parallèles
- Deux bases de sessions
- Pas de SSO entre le workspace et le portail apporteur

### 6.4 🟠 Flux Support — Double système

Le support a :
1. `support_tickets` (table dédiée support interne)
2. `apogee_tickets` (ticketing de développement)
3. `apogee_ticket_support_exchanges` (messages support sur tickets dev)

Un utilisateur qui "demande de l'aide" peut :
- Créer un ticket support (onglet Aide)
- Créer un ticket Apogée avec `is_urgent_support: true`
- Envoyer un message sur un ticket existant

Trois chemins pour la même action.

### 6.5 🟡 Flux Maintenance — Module orphelin

Le module maintenance (`maintenance_alerts`, `maintenance_events`, `maintenance_plan_items`) n'a **pas d'onglet** dédié dans le workspace. Il est accessible uniquement via Outils > Parc, mais la config de plans maintenance (`maintenance_plan_templates`) n'a pas d'UI visible.

---

## 7. ÉCRANS CONFUS

### 7.1 Dashboard Accueil — Trop dense

Le Dashboard (N2+) affiche des KPIs, actions à mener, alertes, et widgets statistiques sur un seul écran. Pour un premier accès, c'est **overwhelming** — trop d'informations sans hiérarchie visuelle claire.

### 7.2 Admin Hub — 6 sous-onglets × N vues

L'admin hub a 6 catégories avec des vues internes :
- Accès: users, activity, droits
- Réseau: agencies
- IA: helpi, statia, validator
- Contenu: guides, faq, templates, annonces, notifs, metadata
- Ops: backup, imports, cache, report, quota
- Plateforme: health, modules, sitemap, lab, flow

**~25 vues** dans un seul onglet. C'est un **mini-CMS** caché dans un onglet.

### 7.3 Outils > Administratif — Nommage confus

"Administratif" contient : Réunions, Plannings, Documents admin. Ce n'est pas de l'administratif au sens métier — c'est de la gestion quotidienne d'agence. Le mot "Administratif" évoque de la paperasse/comptabilité.

---

## 8. 🏆 10 AMÉLIORATIONS MAJEURES

| # | Amélioration | Impact | Effort | Priorité |
|---|-------------|--------|--------|----------|
| 1 | **Éclater l'onglet "Outils"** : Actions → Accueil, Performance → Stats, Commercial → onglet dédié, Apporteurs → onglet dédié | Navigation intuitive | 3j | 🔴 P0 |
| 2 | **Ajouter une cloche de notifications** avec badge temps réel (utiliser `unified_notifications` existant) | Engagement, réactivité | 2j | 🔴 P0 |
| 3 | **Implémenter la recherche globale** (la table `unified_search` et les hooks existent, manque l'UI Command+K) | Productivité x2 | 2j | 🔴 P0 |
| 4 | **Créer des empty states** avec illustrations et CTA pour chaque module sans données | Onboarding naturel | 2j | 🔴 P1 |
| 5 | **Donner accès au planning aux techniciens** (N1) : créer un onglet "Mon Planning" visible pour `franchisee_user` | Fonctionnalité bloquée | 1j | 🔴 P1 |
| 6 | **Ajouter un diagnostic permissions** dans Admin : "Pourquoi l'utilisateur X ne voit pas Y ?" | Support réduction -50% | 2j | 🟠 P2 |
| 7 | **Responsive mobile** : Convertir le tab bar en bottom navigation ou hamburger menu sur mobile | Adoption mobile | 5j | 🟠 P2 |
| 8 | **Unifier le flux support** : Un seul chemin "Demander de l'aide" → ticket support unifié | Clarté, réduction tickets doublons | 3j | 🟠 P2 |
| 9 | **Page "Accès refusé" contextuelle** : expliquer pourquoi un module est grisé + CTA "Demander l'accès" | Réduction frustration | 1j | 🟠 P2 |
| 10 | **Dashboard personnalisable** : widgets drag-and-drop par rôle (N2 = KPIs agence, N1 = planning + tâches) | Pertinence, engagement | 5j | 🟡 P3 |

---

## 9. 🧹 10 SIMPLIFICATIONS PRODUIT

| # | Simplification | Gain | Effort |
|---|---------------|------|--------|
| 1 | **Supprimer l'onglet TEST** de production (feature flag ou N6 only) | Propreté, crédibilité | 5min |
| 2 | **Masquer les sous-onglets disabled** (Guides: Apporteurs, HelpConfort) au lieu de les griser | -75% frustration Guides | 10min |
| 3 | **Renommer le préfixe `divers_`** dans MODULE_DEFINITIONS → noms métiers (`apporteurs`, `plannings`, `reunions`, `documents`) | Cohérence code + UI | 1h |
| 4 | **Supprimer le drag-and-drop** sur les onglets de niveau 1 (surcomplexité pour gain marginal) | -200 lignes code, moins de bugs | 1h |
| 5 | **Fusionner les 41 redirections** admin en un catch-all `/admin/*` → `/?tab=admin` | Maintenabilité routes | 30min |
| 6 | **Transformer le "Profil" dropdown** en lien classique vers `/profile` (pas un faux onglet) | Convention UX respectée | 30min |
| 7 | **Renommer "Administratif"** en "Organisation" ou "Bureau" | Clarté sémantique | 5min |
| 8 | **Intégrer le Changelog** dans le workspace (sous Admin > Plateforme) au lieu d'une page standalone | Cohérence navigation | 30min |
| 9 | **Masquer "Performance"** dans Outils si aucune donnée technicien n'existe (empty state ou hide) | Réduire bruit visuel | 15min |
| 10 | **Fusionner les 2 systèmes de support** (support_tickets + apogee_tickets with is_urgent_support) en un seul | -1 table, clarté flux | 2j |

---

## 10. MATRICE RÔLE × ONGLET (ÉTAT ACTUEL)

| Onglet | N0 | N1 | N2 | N3-N4 | N5-N6 |
|--------|----|----|-----|-------|-------|
| Accueil | Démo | Démo | Dashboard | **FranchiseurView** | Dashboard |
| Stats | ❌ | ❌ | ✅ | **Autre UI** | ✅ |
| Salariés | ❌ | ❌ | ✅ | **Autre UI** | ✅ |
| Outils | ❌ | ❌ | ✅ | **Autre UI** | ✅ |
| Documents | ❌ | ❌ | ✅ | **Autre UI** | ✅ |
| Guides | ❌ | ✅ (1/4) | ✅ (1/4) | **Autre UI** | ✅ (1/4) |
| Ticketing | Si module | Si module | Si module | **Autre UI** | ✅ |
| Aide | Si module | Si module | Si module | **Autre UI** | ✅ |
| Admin | ❌ | ❌ | ❌ | ❌ | ✅ |

**Problème majeur** : Les N3-N4 (franchiseur) ont une **UI complètement séparée** (`FranchiseurView`). Ils ne voient JAMAIS les onglets standards. Ils ne peuvent pas accéder aux guides, à l'aide, au ticketing, ou aux documents **depuis leur interface**.

---

## 11. ANALYSE DU PARCOURS PAR PERSONA

### Persona A : Dirigeant d'agence (N2)
**Satisfaction estimée** : 7/10
- ✅ Dashboard avec KPIs pertinents
- ✅ Gestion RH complète
- ⚠️ "Outils" fourre-tout
- ❌ Pas de notification quand un collaborateur fait une demande

### Persona B : Technicien (N1)
**Satisfaction estimée** : 4/10
- ✅ Guides Apogée
- ❌ Pas de planning personnel
- ❌ Dashboard = démo (pas ses données)
- ❌ 75% des guides désactivés
- ❌ Aucune valeur ajoutée claire

### Persona C : Animateur réseau (N3)
**Satisfaction estimée** : 6/10
- ✅ Vue franchiseur dédiée
- ❌ Pas d'accès aux guides
- ❌ Pas d'accès au ticketing
- ❌ Isolé des outils agence

### Persona D : Admin plateforme (N5+)
**Satisfaction estimée** : 8/10
- ✅ Accès total
- ✅ Admin hub riche
- ⚠️ 25 vues admin = complexe
- ❌ Pas de diagnostic permissions

---

## 12. RÉSUMÉ EXÉCUTIF

```
┌────────────────────────────────────────────────────────┐
│           PRODUCT SCORE : 6.5 / 10                      │
│                                                        │
│  🔴 PROBLÈMES CRITIQUES :                              │
│     - "Outils" = fourre-tout de 6 modules hétérogènes │
│     - Technicien (N1) n'a pas accès à son planning     │
│     - 75% des Guides désactivés mais visibles          │
│     - Onglet TEST visible en production                │
│     - Franchiseur isolé des fonctionnalités communes   │
│                                                        │
│  🟠 PROBLÈMES MODÉRÉS :                                │
│     - Pas de notifications in-app                      │
│     - Pas de recherche globale                         │
│     - Pas d'empty states                               │
│     - Double système support                           │
│     - Profil en faux onglet dropdown                   │
│                                                        │
│  ✅ POINTS FORTS :                                     │
│     - Workspace unifié bien architecturé               │
│     - Permissions granulaires (16 modules × options)   │
│     - Drag-and-drop onglets                            │
│     - URL routing ?tab=X pour deep linking             │
│     - Lazy loading de tous les contenus d'onglets      │
│     - Impersonation admin pour debug                   │
│                                                        │
│  📈 GAINS QUICK WINS (1 jour) :                        │
│     - Supprimer onglet TEST (5min)                     │
│     - Masquer guides disabled (10min)                  │
│     - Renommer "Administratif" (5min)                  │
│     - Page accès refusé contextuelle (4h)              │
│                                                        │
│  🎯 SCORE CIBLE après améliorations P0+P1 : 8.0/10    │
└────────────────────────────────────────────────────────┘
```

---

## 13. PLAN D'ACTION PRODUIT

### Sprint 1 — Quick Wins (1 jour)
- Supprimer/masquer onglet TEST
- Masquer sous-onglets Guides disabled
- Renommer "Administratif" → "Organisation"
- Renommer modules `divers_*` en noms métiers

### Sprint 2 — Navigation (3 jours)
- Éclater l'onglet "Outils" en navigation cohérente
- Ajouter onglet "Mon Planning" pour N1
- Transformer profil dropdown en lien standard
- Fusionner redirections admin

### Sprint 3 — Engagement (3 jours)
- Implémenter notifications in-app (cloche + badge)
- Implémenter recherche globale (Command+K)
- Créer empty states pour tous les modules

### Sprint 4 — Cohérence (2 jours)
- Unifier le flux support
- Page "Accès refusé" contextuelle
- Diagnostic permissions admin
- Donner accès guides/aide/ticketing aux franchiseurs

---

*Audit Produit SaaS HelpConfort — V0.9.1 — 7 Mars 2026*  
*Prochaine révision : Après Sprint 1 + 2*
