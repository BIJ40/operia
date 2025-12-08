# AUDIT GLOBAL HELPCONFORT SaaS - 08/12/2025

## 1. RÉSUMÉ EXÉCUTIF

### État général du projet
Le projet HelpConfort Services présente une architecture solide avec un système de permissions V2.0 bien structuré. Les principaux risques identifiés concernent la cohérence des calculs StatIA et quelques Edge Functions utilisant encore des CORS trop permissifs.

### Corrections P0/P1/P2 appliquées

#### Sécurité
- ✅ **P0 - Helper auth centralisé créé** : `supabase/functions/_shared/auth.ts`
  - `getUserContext()` : récupère le contexte utilisateur complet
  - `assertRoleAtLeast()` : vérifie le rôle minimum
  - `assertAgencyAccess()` : vérifie l'accès à une agence
  - `hasModule()`, `hasModuleOption()` : vérifie les modules activés
  
- ✅ **P0 - sensitive-data hardened** : 
  - CORS centralisé via `_shared/cors.ts`
  - Rate limiting ajouté (10 req/min)
  - Logging audit amélioré
  - Toutes les réponses utilisent `withCors()`

#### StatIA
- ✅ **P0 - factureMeta helper créé** : `src/statia/shared/factureMeta.ts`
  - `extractFactureMeta()` : extraction uniformisée des données facture
  - `isFactureIncludedForStat()` : filtrage selon StatParams
  - `calculateCAFromFactures()` : calcul CA avec avoirs négatifs
  - `verifyCACohérence()` : self-check de cohérence CA

### Situation sécurité

| Composant | État | Notes |
|-----------|------|-------|
| proxy-apogee | ✅ Sécurisé | JWT + rate limiting + isolation agence |
| network-kpis | ✅ Sécurisé | JWT + N3+ requis + rate limiting |
| sensitive-data | ✅ Corrigé | CORS hardened, rate limiting ajouté |
| maintenance-alerts-scan | ⚠️ P3 | Fonction CRON, verify_jwt=false (acceptable) |
| qr-asset | ⚠️ P3 | Public par design (QR codes) |

### Situation StatIA

| Aspect | État | Notes |
|--------|------|-------|
| Règles CA | ✅ Documenté | STATIA_RULES dans domain/rules.ts |
| Avoirs | ✅ Helper créé | factureMeta.ts gère les négatifs |
| Techniciens | ⚠️ P1 | Besoin refactoring avec factureMeta |
| Self-check | ✅ Créé | verifyCACohérence() disponible |

---

## 2. TABLEAU PAR MODULE

### A. Socle technique & Auth

| Fichier | Corrections | Priorité |
|---------|-------------|----------|
| `_shared/auth.ts` | Créé | P0 |
| `_shared/cors.ts` | Existant, OK | - |
| `_shared/rateLimit.ts` | Existant, OK | - |
| `AuthContext.tsx` | V2.0, OK | - |

### B. Edge Functions critiques

| Fonction | Corrections P0/P1 | État |
|----------|------------------|------|
| proxy-apogee | 0 (déjà sécurisé) | ✅ |
| network-kpis | 0 (déjà sécurisé) | ✅ |
| sensitive-data | 3 (CORS, rate limit, logging) | ✅ |
| create-user | 0 | À auditer |
| delete-user | 0 | À auditer |
| export-my-data | 0 | À auditer |

### C. StatIA Engine

| Fichier | Corrections | État |
|---------|-------------|------|
| `domain/rules.ts` | 0 | ✅ Complet |
| `shared/factureMeta.ts` | Créé | ✅ P0 |
| `definitions/*.ts` | P1 - À refactorer | ⚠️ |
| `engine/computeStat.ts` | P1 - À refactorer | ⚠️ |

---

## 3. LISTE EXHAUSTIVE DES P3 NON TRAITÉS

### Sécurité Edge Functions

| ID | Module | Description | Fichiers | Effort |
|----|--------|-------------|----------|--------|
| SEC-01 | maintenance-alerts-scan | Ajouter validation token interne ou auth minimale | `/supabase/functions/maintenance-alerts-scan/index.ts` | S |
| SEC-02 | qr-asset | Limiter les informations exposées publiquement | `/supabase/functions/qr-asset/index.ts` | S |
| SEC-03 | create-user | Audit complet des contrôles de création | `/supabase/functions/create-user/index.ts` | M |
| SEC-04 | delete-user | Audit des contrôles de suppression | `/supabase/functions/delete-user/index.ts` | M |
| SEC-05 | Toutes fonctions | Migrer vers auth.ts helper partagé | Toutes EF | L |

### StatIA Refactoring

| ID | Module | Description | Fichiers | Effort |
|----|--------|-------------|----------|--------|
| STA-01 | CA Global | Refactorer avec factureMeta | `definitions/ca.ts` | M |
| STA-02 | CA Univers | Refactorer avec factureMeta | `definitions/univers.ts` | M |
| STA-03 | CA Technicien | Refactorer avec factureMeta | `definitions/techniciens.ts` | M |
| STA-04 | CA Apporteur | Refactorer avec factureMeta | `definitions/apporteurs.ts` | M |
| STA-05 | Self-check UI | Page admin /admin/statia/debug | Nouveau fichier | L |
| STA-06 | Network aggregation | Définir stratégie par métrique | `engine/computeStat.ts` | M |

### Modules Front

| ID | Module | Description | Fichiers | Effort |
|----|--------|-------------|----------|--------|
| MOD-01 | Help Academy | Audit complet UX/permissions | `src/pages/HelpAcademy*` | M |
| MOD-02 | RH & Parc | Finaliser Phase 3-6 | `src/pages/rh-module/*` | XL |
| MOD-03 | Support | Audit live chat stabilité | `src/components/support/*` | M |
| MOD-04 | Pilotage | Harmoniser dashboards | `src/pages/pilotage/*` | L |
| MOD-05 | Franchiseur | Audit comparatifs | `src/pages/franchiseur/*` | M |

### Observabilité

| ID | Module | Description | Fichiers | Effort |
|----|--------|-------------|----------|--------|
| OBS-01 | StatIA debug | Page /admin/statia/metrics | Nouveau | M |
| OBS-02 | Audit logging | Centraliser logs sensibles | Edge Functions | M |
| OBS-03 | Monitoring | Alertes Sentry améliorées | Config Sentry | S |

---

## 4. POINTS NON TRAITABLES AUTOMATIQUEMENT

### Décisions métier requises

1. **Stratégie d'agrégation réseau StatIA**
   - Actuellement: sum par défaut pour toutes les métriques
   - Besoin: définir sum vs weighted_average vs unweighted_average par métrique
   - Recommandation: workshop avec équipe métier pour définir les règles

2. **Univers non mappés**
   - Des univers inconnus peuvent apparaître dans les données Apogée
   - Recommandation: créer un processus de revue périodique des univers non catégorisés

3. **Attribution CA technicien multi-interventions**
   - Cas edge: facture avec plusieurs interventions, techniciens différents
   - Règle actuelle: prorata au temps (via getInterventionsCreneaux)
   - Recommandation: valider avec le métier que c'est le comportement souhaité

### Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Incohérence CA cross-modules | Moyenne | Élevé | Refactorer avec factureMeta |
| Fuite données multi-agences | Faible | Critique | Proxy-apogee déjà sécurisé |
| Rate limiting contourné | Faible | Moyen | Rate limit en mémoire OK pour charge actuelle |

---

## 5. PROCHAINES ÉTAPES RECOMMANDÉES

### Sprint immédiat (P0 restants)
1. ✅ ~~Helper auth.ts créé~~
2. ✅ ~~sensitive-data sécurisé~~
3. ✅ ~~factureMeta.ts créé~~
4. Refactorer `ca_global_ht` avec factureMeta
5. Ajouter self-check automatique en dev

### Sprint suivant (P1)
1. Migrer toutes les métriques CA vers factureMeta
2. Implémenter verifyCACohérence() dans computeStat
3. Créer page /admin/statia/debug
4. Audit create-user et delete-user

### Backlog (P2/P3)
1. Toutes les Edge Functions vers auth.ts helper
2. Audit complet modules front
3. Documentation architecture complète

---

*Rapport généré le 08/12/2025 - Audit V1.0*
