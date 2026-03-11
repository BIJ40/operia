# Phase 4 — Wave 1 bis : Rapport correctif

Date : 2026-03-11

## 1. Résumé

Correctif ciblé pour finaliser la migration Wave 1 : 4 guards legacy encore actifs dans `DiversTabContent.tsx` ont été remplacés par leurs clés hiérarchiques.

| Métrique | Valeur |
|---|---|
| Fichiers modifiés | 1 |
| Remplacements effectués | 4 |
| Périmètre respecté | ✅ Strictement 1 fichier |

## 2. Remplacements effectués

| # | Ligne | Clé legacy | Nouvelle clé |
|---|---|---|---|
| 1 | L65 | `divers_apporteurs` | `organisation.apporteurs` |
| 2 | L67 | `parc` | `organisation.parc` |
| 3 | L242 | `divers_reunions` | `organisation.reunions` |
| 4 | L243 | `divers_plannings` | `organisation.plannings` |

## 3. Fichier modifié

| Fichier | Type d'impact |
|---|---|
| `src/components/unified/tabs/DiversTabContent.tsx` | tab visibility (requiresModule dans config arrays) |

## 4. Vérification sécurité

| Élément | Statut |
|---|---|
| Backend | ✅ Inchangé |
| Supabase | ✅ Inchangé |
| `user_modules` | ✅ Inchangé |
| `plan_tier_modules` | ✅ Inchangé |
| COMPAT_MAP | ✅ Inchangé |
| `ticketing` | ✅ Inchangé |
| `rightsTaxonomy.ts` | ✅ Non touché |
| `constants.ts` / `shared-constants.ts` | ✅ Non touchés |

## 5. Confirmation périmètre

- ✅ Aucun autre fichier touché
- ✅ Aucune migration Supabase
- ✅ Aucune modification backend
- ✅ Le COMPAT_MAP assure le fallback : `organisation.apporteurs` → `divers_apporteurs`, `organisation.parc` → `parc`, `organisation.reunions` → `divers_reunions`, `organisation.plannings` → `divers_plannings`
- ✅ Aucun risque de rupture d'accès pour les profils legacy
