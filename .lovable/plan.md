

# Audit de duplication du module_registry — Diagnostic et plan de déduplication

## Diagnostic confirmé

Votre analyse est exacte. Le `module_registry` contient **3 générations de clés** coexistantes :

```text
┌─────────────────────────────────────────────────────────┐
│  Génération 1 — LEGACY PLATES                           │
│  agence, stats.*, divers_apporteurs, divers_plannings,  │
│  divers_reunions, divers_documents, parc, rh, salaries, │
│  prospection, realisations, ticketing.*, guides.*,      │
│  aide.*, outils.*                                       │
├─────────────────────────────────────────────────────────┤
│  Génération 2 — OUTILS (semi-hiérarchique)              │
│  outils.apporteurs.*, outils.parc.*, outils.commercial, │
│  outils.administratif.plannings/documents/reunions      │
├─────────────────────────────────────────────────────────┤
│  Génération 3 — HIÉRARCHIQUE (cible)                    │
│  pilotage.*, commercial.*, organisation.*,              │
│  mediatheque.*, support.*, admin.*                      │
└─────────────────────────────────────────────────────────┘
```

## Cartographie des duplications (15 groupes)

| Concept fonctionnel | Clé CANONIQUE (G3) | Doublons à retirer |
|---|---|---|
| Statistiques | `pilotage.statistiques.*` | `stats.*` (7 clés) |
| Apporteurs | `organisation.apporteurs` | `divers_apporteurs`, `outils.apporteurs.*` |
| Plannings | `organisation.plannings` | `divers_plannings`, `outils.administratif.plannings` |
| Parc | `organisation.parc` | `parc`, `outils.parc.*` |
| Documents | `mediatheque.*` | `divers_documents`, `documents.*`, `outils.administratif.documents` |
| Réunions | `organisation.reunions` | `divers_reunions`, `outils.administratif.reunions` |
| Salariés | `organisation.salaries` | `rh`, `salaries.*` |
| Ticketing | `support.ticketing` | `ticketing.*` (racine) |
| Commercial | `commercial.*` | `prospection`, `outils.commercial` |
| Réalisations | `commercial.realisations` | `realisations` |
| Agence | `pilotage.agence` | `agence` |
| Guides | `support.guides` | `guides.*` |
| Aide | `support.aide_en_ligne` | `aide.*` |
| FAQ | `support.faq` | `guides.faq` |
| Admin | `admin.*` | `admin_plateforme.*` |

**Total : ~40 clés doublons à retirer, 7 domaines hiérarchiques canoniques à conserver.**

## Bug immédiat Statistiques — cause racine

```text
RPC retourne pour Clémence (plan STARTER) :
  ✅ pilotage.statistiques         → enabled: true
  ✅ pilotage.statistiques.general → enabled: true
  ✅ agence                        → enabled: true, options: {}  ← PAS de stats_hub !

PilotageIndex.tsx ligne 114 :
  hasModuleOption('agence', 'stats_hub')  →  FALSE  ← clé legacy, option vide
```

Le guard utilise une clé G1 (`agence.stats_hub`) alors que le plan alimente des clés G3 (`pilotage.statistiques`).

## Plan d'exécution en 3 phases

### Phase A — Fix immédiat PilotageIndex (1 fichier, 2 lignes)

Corriger les guards de `src/pages/PilotageIndex.tsx` pour utiliser les clés canoniques :

```typescript
// Ligne 114 : AVANT
const hasStatsAccess = isPlatformAdmin || hasModuleOption('agence', 'stats_hub');
// APRÈS
const hasStatsAccess = isPlatformAdmin || hasModule('pilotage.statistiques');

// Ligne 115 : AVANT  
const hasApporteursAccess = isPlatformAdmin || hasModuleOption('agence', 'mes_apporteurs');
// APRÈS
const hasApporteursAccess = isPlatformAdmin || hasModule('organisation.apporteurs');
```

Corriger aussi `src/contexts/DataPreloadContext.tsx` ligne 197 :
```typescript
// AVANT
return hasModuleOption('stats', 'stats_hub');
// APRÈS  
return hasModule('pilotage.statistiques');
```

### Phase B — Audit complet des 28 fichiers consommateurs

Scanner les 28 fichiers qui appellent `hasModule` / `hasModuleOption` et identifier chaque appel qui utilise une clé G1 ou G2, produire un rapport de mapping :

```text
fichier → clé legacy utilisée → clé canonique de remplacement
```

Pas de modification de code dans cette phase — uniquement le rapport.

### Phase C — Nettoyage du registre (base de données)

Une fois toutes les références code migrées vers G3, retirer les ~40 clés G1/G2 du `module_registry` et de `plan_tier_modules` / `user_modules`.

Ceci nécessite une migration SQL coordonnée (hors périmètre immédiat).

## Proposition

Exécuter immédiatement la **Phase A** (fix Statistiques + DataPreload) pour débloquer Clémence, puis produire le rapport d'audit Phase B dans un fichier `dev-reports/`.

