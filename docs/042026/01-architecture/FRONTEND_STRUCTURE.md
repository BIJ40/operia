# Architecture Frontend OPERIA

> **Date** : 29 mars 2026

---

## 1. Arborescence `src/`

```
src/
├── App.tsx                    # Point d'entrée, providers, router
├── main.tsx                   # Bootstrap React + Sentry
├── index.css                  # Design tokens (CSS variables)
│
├── routes/                    # Définitions de routes
│   ├── index.ts               # Agrégateur central
│   ├── admin.routes.tsx       # Routes admin (N4+)
│   ├── franchiseur.routes.tsx # Routes franchiseur (N3+)
│   ├── pilotage.routes.tsx    # Routes pilotage
│   ├── rh.routes.tsx          # Routes RH/salariés
│   ├── support.routes.tsx     # Routes support/ticketing
│   ├── academy.routes.tsx     # Routes Help! Academy
│   ├── apporteur.routes.tsx   # Routes portail apporteurs
│   ├── projects.routes.tsx    # Routes dossiers/projets
│   ├── realisations.routes.tsx# Routes réalisations AVAP
│   └── public.routes.tsx      # Routes publiques
│
├── pages/                     # Composants page (top-level)
│   ├── Index.tsx              # UnifiedWorkspace (page principale)
│   ├── Auth.tsx               # Login/register
│   ├── AdminHub.tsx           # Hub admin
│   └── ...
│
├── components/                # Composants réutilisables
│   ├── ui/                    # shadcn/ui (Button, Dialog, etc.)
│   ├── guards/                # RoleGuard, ModuleGuard, FeatureGuard, PlanGuard
│   ├── layout/                # Header, Sidebar, Footer
│   └── shared/                # Composants communs métier
│
├── contexts/                  # React Contexts
│   ├── AuthContext.tsx         # Auth + profil utilisateur
│   └── ...
│
├── hooks/                     # Hooks réutilisables
│   ├── access-rights/         # 11 hooks de vérification d'accès
│   ├── useEffectiveModules.ts # Modules effectifs (RPC)
│   ├── useAgencySubscription.ts
│   └── ...
│
├── permissions/               # Moteur de permissions
│   ├── permissionsEngine.ts   # Résolution client (~613 lignes)
│   ├── constants.ts           # Constantes hardcodées (~168 lignes)
│   ├── moduleRegistry.ts      # Registre modules (~191 lignes)
│   ├── shared-constants.ts    # Constantes partagées frontend/edge
│   └── franchisorAccess.ts    # Accès interface franchiseur
│
├── config/                    # Configuration métier
│   ├── modulesByRole.ts       # Modules par rôle (fallback)
│   ├── moduleTree.ts          # Arbre de navigation
│   ├── roleAgenceModulePresets.ts  # Presets poste N1
│   └── rightsTaxonomy.ts      # Taxonomie des droits (admin)
│
├── types/                     # Types TypeScript
│   ├── modules.ts             # MODULE_DEFINITIONS (928 lignes)
│   ├── globalRoles.ts         # Enum rôles N0-N6
│   └── ...
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # Client Supabase configuré
│       └── types.ts           # Types auto-générés (read-only)
│
├── services/                  # Services métier
├── repositories/              # Couche d'accès données
├── lib/                       # Utilitaires bas niveau
├── utils/                     # Fonctions utilitaires
│
├── statia/                    # Moteur StatIA (statistiques)
├── modules/                   # Modules métier isolés
│   ├── performance/           # Moteur performance terrain
│   └── interventions_rt/      # Interventions temps réel
│
├── commercial/                # Module commercial
├── prospection/               # Module prospection/CRM
├── suivi/                     # Module suivi client
├── realisations/              # Module réalisations AVAP
├── apporteur/                 # Module apporteurs
├── planning-v2/               # Module planning augmenté
├── franchiseur/               # Module franchiseur
│
├── apogee-connect/            # Intégration Apogée
├── apogee-tickets/            # Module ticketing
│
├── shared/                    # Composants/utils partagés inter-modules
├── extensions/                # Extensions et plugins
├── devtools/                  # Outils développeur
├── data/                      # Données statiques (seed)
├── assets/                    # Images, icônes
└── test/                      # Configuration tests
```

---

## 2. Navigation — UnifiedWorkspace

La page principale (`/`) utilise un système d'onglets via query parameter :

```
URL : /?tab={module_key}
```

### Structure des onglets

| Section | Onglets | Guard |
|---------|---------|-------|
| **Accueil** | Dashboard agence | Aucun |
| **Commercial** | suivi_client, comparateur, prospects, realisations, signature, social | ModuleGuard |
| **Organisation** | salaries, plannings, reunions, documents_legaux, zones, apporteurs | ModuleGuard |
| **Pilotage** | statistiques, performance, actions, resultat, tresorerie, maps, rentabilite | ModuleGuard + PlanGuard |
| **Médiathèque** | consulter, documents, faq, exports | ModuleGuard |
| **Support** | guides, aide_en_ligne, ticketing | ModuleGuard |

### Règle d'accessibilité à 3 états

| État | Condition | Rendu |
|------|-----------|-------|
| **Masqué** | Module non déployé (`is_deployed = false`) | Non affiché |
| **Grisé** | Module déployé mais plan/rôle insuffisant | Affiché disabled + tooltip |
| **Cliquable** | Module déployé ET accessible | Normal |

---

## 3. Système de Guards

### Guards disponibles

| Guard | Rôle | Props |
|-------|------|-------|
| `RoleGuard` | Vérifie le rôle global minimum | `minRole: GlobalRole` |
| `ModuleGuard` | Vérifie l'accès à un module | `module: ModuleKey, option?: string` |
| `FeatureGuard` | Vérifie une feature agence (pack) | `featureKey: string` |
| `PlanGuard` | Vérifie le plan agence | `requiredPlan: 'STARTER' \| 'PRO'` |

### Ordre de vérification

```
1. Auth (connecté ?)
2. RoleGuard (rôle suffisant ?)
3. ModuleGuard (module accordé ?)
4. PlanGuard (plan suffisant ?)
5. FeatureGuard (feature active ?)
```

---

## 4. Conventions

### Nommage fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Composant | PascalCase | `AgencyDashboard.tsx` |
| Hook | camelCase, préfixe `use` | `useAgencyKpis.ts` |
| Service | camelCase, suffixe `Service` | `customMetricsService.ts` |
| Type | PascalCase | `ModuleDefinition.ts` |
| Route | kebab-case, suffixe `.routes` | `admin.routes.tsx` |
| Constante | UPPER_SNAKE_CASE | `BYPASS_ROLES` |

### Patterns UI

- **Pas de popups/modals non sollicités** (NO_POPUP_POLICY)
- **Toast pour feedback** : utiliser `sonner` (via `useToast`)
- **Dialog pour actions destructrices** : confirmation obligatoire
- **Loading states** : skeleton ou spinner, jamais de blanc
- **Responsive** : mobile-first, breakpoints Tailwind

### Design tokens

Toutes les couleurs utilisent les CSS variables de `index.css` :

```css
:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
  --secondary: ...;
  --muted: ...;
  --accent: ...;
}
```

**Interdit** : `text-white`, `bg-black`, couleurs hardcodées dans les composants.
