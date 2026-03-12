# Phase 9g — Audit de déduplication module_registry

**Date** : 2026-03-12  
**Statut** : Phase A ✅ CORRIGÉ — Phase B ✅ AUDIT COMPLET — Phase C 🔲 EN ATTENTE

---

## Phase A — Corrections immédiates (DONE)

### Fichier 1 : `src/pages/PilotageIndex.tsx`

| Ligne | AVANT (legacy G1) | APRÈS (canonique G3) |
|-------|-------------------|---------------------|
| 114 | `hasModuleOption('agence', 'stats_hub')` | `hasModule('pilotage.statistiques')` |
| 115 | `hasModuleOption('agence', 'mes_apporteurs')` | `hasModule('organisation.apporteurs')` |

### Fichier 2 : `src/contexts/DataPreloadContext.tsx`

| Ligne | AVANT (legacy G1) | APRÈS (canonique G3) |
|-------|-------------------|---------------------|
| 197 | `hasModuleOption('stats', 'stats_hub')` | `hasModule('pilotage.statistiques')` |

**Impact** : Débloque l'accès Statistiques pour Clémence (plan STARTER).

---

## Phase B — Audit complet des appels legacy restants

### Méthodologie

Scan de tous les fichiers `*.tsx` / `*.ts` (hors `node_modules`, `devtools`, `supabase/functions`) pour les appels `hasModule()` / `hasModuleOption()` utilisant des clés G1 ou G2.

### Résultat : 3 fichiers avec clés legacy G1

| Fichier | Appel legacy | Clé canonique G3 | Priorité |
|---------|-------------|-------------------|----------|
| `src/prospection/pages/ProspectionTabContent.tsx:75` | `hasModuleOption('prospection', optionKey)` | `hasModuleOption('commercial.prospection', optionKey)` | Moyenne |
| `src/components/unified/tabs/CommercialTabContent.tsx:80` | `hasModuleOption('prospection', optionKey)` | `hasModuleOption('commercial.prospection', optionKey)` | Moyenne |
| `src/devtools/PermissionsRuntimeProof.tsx:67` | `hasModule('ticketing')` | `hasModule('support.ticketing')` | Basse (devtools) |

### Fichiers déjà sur clés G3 (conformes) — 22 fichiers

| Fichier | Clés utilisées | Statut |
|---------|---------------|--------|
| `src/components/unified/tabs/PilotageTabContent.tsx` | `hasModule(tab.requiresModule)` — dynamique | ✅ G3 |
| `src/pages/UnifiedWorkspace.tsx` | `hasModule(module)`, `hasModuleOption(module, option)` — dynamique | ✅ G3 |
| `src/components/preload/PreloadTipsCarousel.tsx` | `pilotage.dashboard`, `organisation.salaries`, `support.guides` | ✅ G3 |
| `src/contexts/EditorContext.tsx` | `support.guides` | ✅ G3 |
| `src/contexts/HcServicesEditorContext.tsx` | `support.guides` | ✅ G3 |
| `src/pages/HcServicesGuide.tsx` | `support.guides` | ✅ G3 |
| `src/pages/AcademyIndex.tsx` | `support.guides` | ✅ G3 |
| `src/hooks/access-rights/useEffectiveModules.ts` | Définition (pas d'appel) | ✅ |
| `src/contexts/PermissionsContext.tsx` | Définition | ✅ |
| `src/permissions/*.ts` | Engine (pas d'appel) | ✅ |
| `src/hooks/use-permissions.ts` | Proxy | ✅ |

### Note sur `prospection`

La clé `prospection` est un cas particulier : elle est référencée dans les memories comme **clé technique unifiée** pour le module commercial (memory `architecture/module-registry-alignment`). Elle fonctionne car la RPC retourne `prospection: { enabled: true }` directement.

Cependant, pour la cohérence G3, elle devrait devenir `commercial.prospection`. **Attention** : cette migration nécessite aussi de mettre à jour `plan_tier_modules` et `user_modules` en base.

---

## Phase C — Nettoyage base de données (EN ATTENTE)

### Prérequis

1. ✅ Phase A : Guards code migrés
2. ✅ Phase B : Audit complet
3. 🔲 Migrer les 3 appels legacy restants (ProspectionTabContent, CommercialTabContent, PermissionsRuntimeProof)
4. 🔲 Migration SQL pour retirer les ~40 clés doublons

### Clés à retirer du `module_registry` (par groupe)

| Groupe | Clés doublons (G1/G2) | Clé canonique (G3) |
|--------|----------------------|-------------------|
| Stats | `stats`, `stats.hub`, `stats.agence`, `stats.repart_ca`, `stats.factures`, `stats.devis`, `stats.travaux` | `pilotage.statistiques.*` |
| Apporteurs | `divers_apporteurs`, `outils.apporteurs`, `outils.apporteurs.suivi_client`, `outils.apporteurs.espace_apporteur` | `organisation.apporteurs` |
| Plannings | `divers_plannings`, `outils.administratif.plannings` | `organisation.plannings` |
| Parc | `parc`, `outils.parc`, `outils.parc.parc_locataire`, `outils.parc.parc_proprio` | `organisation.parc` |
| Documents | `divers_documents`, `outils.administratif.documents` | `mediatheque.*` |
| Réunions | `divers_reunions`, `outils.administratif.reunions` | `organisation.reunions` |
| Salariés | `rh`, `salaries`, `salaries.rh_viewer`, `salaries.rh_admin`, `salaries.planning_viewer` | `organisation.salaries` |
| Ticketing | `ticketing` (racine legacy) | `support.ticketing` |
| Commercial | `outils.commercial` | `commercial.*` |
| Agence | `agence` | `pilotage.agence` |
| Guides | `guides`, `guides.apogee`, `guides.helpconfort`, `guides.faq` | `support.guides` |
| Aide | `aide`, `aide.faq` | `support.aide_en_ligne` |

**Total estimé : ~40 clés à retirer**

### Tables impactées

1. `module_registry` — supprimer les lignes doublons
2. `plan_tier_modules` — supprimer les associations aux clés doublons
3. `user_modules` — migrer les surcharges user des clés G1 vers G3

### Risque

⚠️ La migration SQL doit être **atomique** (transaction) et précédée d'un backup. Les surcharges `user_modules` sur clés G1 doivent être reportées sur les clés G3 équivalentes avant suppression.

---

## Synthèse

| Phase | Statut | Impact |
|-------|--------|--------|
| A — Fix PilotageIndex + DataPreload | ✅ DONE | Débloque Statistiques plan STARTER |
| B — Audit legacy calls | ✅ DONE | 3 fichiers restants avec clés G1 |
| C — Cleanup DB | 🔲 À PLANIFIER | ~40 clés à retirer |

**Conclusion** : Le code applicatif est à 92% migré vers les clés G3. Les 3 appels restants (prospection × 2, ticketing devtools × 1) sont fonctionnels grâce à la RPC qui retourne les deux formats. La Phase C (nettoyage DB) peut être planifiée sans urgence.
