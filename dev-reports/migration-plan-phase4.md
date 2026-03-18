# Migration Plan — Phase 4

Date: 2026-03-11

## Prérequis BLOQUANT

> **Avant toute migration de guard**, les deux chemins `hasModule` doivent être unifiés.
> 
> Actuellement :
> - **Chemin A** (`useEffectiveModules().hasModule`) → utilise COMPAT_MAP ✅
> - **Chemin B** (`usePermissions().hasModule` / `ModuleGuard`) → PAS de COMPAT_MAP ❌
> 
> **Action requise** : Injecter le COMPAT_MAP dans le Chemin B, ou faire en sorte que `ModuleGuard` / `usePermissions().hasModule` délèguent à `useEffectiveModules().hasModule`.

## Ordre de migration

### 1️⃣ Pilotage (Risque: MOYEN)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `pilotage.routes.tsx` | `agence` + option `indicateurs` | `pilotage.performance` | MOYEN |
| `pilotage.routes.tsx` | `agence` + option `actions_a_mener` | `pilotage.actions_a_mener` | MOYEN |
| `pilotage.routes.tsx` | `agence` + option `diffusion` | `pilotage.diffusion` | MOYEN |
| `pilotage.routes.tsx` | `agence` + option `mes_apporteurs` | — | FAIBLE |
| `pilotage.routes.tsx` | `agence` (RH tech) | — | FAIBLE |
| `PilotageTabContent.tsx` | Déjà via `useEffectiveModules` | — | AUCUN |

### 2️⃣ Organisation (Risque: FAIBLE)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `rh.routes.tsx` | `rh` + options `rh_viewer/rh_admin` | `organisation.salaries` | FAIBLE |
| `OrganisationTabContent.tsx` | Déjà via `useEffectiveModules` | — | AUCUN |

### 3️⃣ Médiathèque (Risque: FAIBLE)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `DocumentsTabContent.tsx` | `documents.gerer`, `documents.corbeille_vider` | `mediatheque.gerer`, `mediatheque.corbeille` | FAIBLE |
| Routes documents | Pas de ModuleGuard direct | — | AUCUN |

### 4️⃣ Commercial (Risque: FAIBLE)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `realisations.routes.tsx` | `realisations` | `commercial.realisations` | FAIBLE |
| `CommercialTabContent.tsx` | Déjà via `useEffectiveModules` | — | AUCUN |

### 5️⃣ Support (Risque: FAIBLE sauf ticketing)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `academy.routes.tsx` (x5) | `guides` | `support.guides` | FAIBLE |
| `AideTabContent.tsx` | Déjà via `useEffectiveModules` | — | AUCUN |

### 6️⃣ Admin (Risque: FAIBLE)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `AdminTabContent.tsx` | Via `useEffectiveModules` | — | AUCUN |
| `DiversTabContent.tsx` | Via `useEffectiveModules` | — | AUCUN |

### ⚠️ DERNIER — Ticketing (Risque: ÉLEVÉ)

| Fichier | current_key | target_key | risk_level |
|---|---|---|---|
| `projects.routes.tsx` (x7) | `ticketing` | `support.ticketing` | **ÉLEVÉ** |

**Raison du risque élevé** :
- Module en production active
- `required_plan = 'NONE'` — accès uniquement par `user_modules` override
- `ModuleGuard` utilise le Chemin B (sans COMPAT_MAP)
- Toute erreur = perte d'accès pour les utilisateurs ticketing

**Stratégie de migration ticketing** :
1. D'abord unifier les chemins hasModule
2. Vérifier que `ModuleGuard moduleKey="support.ticketing"` résout via COMPAT_MAP
3. Tester avec un utilisateur réel en impersonation
4. Basculer les 7 routes d'un coup (atomique)
5. Monitoring post-déploiement

## Résumé

| Domaine | Fichiers guards | Risque | Dépend de l'unification |
|---|---|---|---|
| Pilotage | 5 routes | MOYEN | OUI |
| Organisation | 3 routes | FAIBLE | OUI |
| Médiathèque | 1 composant | FAIBLE | NON (déjà Chemin A) |
| Commercial | 3 routes | FAIBLE | OUI |
| Support (hors ticketing) | 5 routes | FAIBLE | OUI |
| Admin | 0 routes guards | AUCUN | NON |
| **Ticketing** | **7 routes** | **ÉLEVÉ** | **OUI** |
