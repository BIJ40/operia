# Rapport Étape 5 — Couverture MFA effective sur le workspace unifié

> Date : 2026-03-08

## 1. Résumé exécutif

### Avant cette étape

Le MfaGuard était branché uniquement sur **2 routes standalone admin** (`/admin/agencies/:id`, `/admin/support/settings`). Ces routes ne sont que des pages de détail rarement visitées directement — le vrai flux utilisateur passe par le **workspace unifié** (`/` → onglet Admin).

**En clair : 95% du flux admin sensible n'était pas protégé par MFA.**

### Ce qui n'était pas protégé

| Zone | Flux réel | Était protégé ? |
|------|-----------|-----------------|
| Onglet Admin complet | `/?tab=admin` | ❌ |
| Gestion utilisateurs | `/?tab=admin&adminTab=gestion&adminView=users` | ❌ |
| Exports / Backups | `/?tab=admin&adminTab=ops&adminView=backup` | ❌ |
| Export Database | `/?tab=admin&adminTab=ops&adminView=database` | ❌ |
| Modules / Feature Flags | `/?tab=admin&adminTab=plateforme&adminView=modules` | ❌ |
| Réseau franchiseur | `/?tab=admin&adminTab=franchiseur` | ❌ |
| Données RH sensibles | `/?tab=salaries` (SSN, ICE) | ❌ |
| Impersonation (réelle) | Dialog `RealUserImpersonationDialog` | ❌ |
| Impersonation (simulation) | Dialog `ImpersonationDialog` | ❌ |

### Ce qui a été branché maintenant

| Zone | Composant protégé | MfaGuard ajouté |
|------|-------------------|-----------------|
| **Onglet Admin entier** | `AdminTabContent.tsx` | ✅ |
| → Gestion utilisateurs | Couvert par parent | ✅ |
| → Exports / Backups | Couvert par parent | ✅ |
| → Export Database | Couvert par parent | ✅ |
| → Modules / Feature Flags | Couvert par parent | ✅ |
| → Réseau franchiseur | Couvert par parent | ✅ |
| → IA, Contenu, Ops, Plateforme | Couvert par parent | ✅ |
| **Données RH sensibles** | `CollaborateursTabContent.tsx` | ✅ |
| **Impersonation réelle** | `RealUserImpersonationDialog.tsx` | ✅ |
| **Impersonation simulation** | `ImpersonationDialog.tsx` | ✅ |

## 2. Cartographie des zones sensibles

### Workspace unifié (`/`)

| Onglet | Sous-onglet | Composant | Rôle min | MFA protégé |
|--------|------------|-----------|----------|-------------|
| admin | gestion > users | `TDRUsersPage` | N5 | ✅ via `AdminTabContent` |
| admin | gestion > inscriptions | `PendingRegistrationsList` | N5 | ✅ via `AdminTabContent` |
| admin | gestion > apporteurs | `ApporteurManagersAdminView` | N5 | ✅ via `AdminTabContent` |
| admin | gestion > agences | `ReseauView` | N5 | ✅ via `AdminTabContent` |
| admin | gestion > modules | `ModulesMasterView` | N5 | ✅ via `AdminTabContent` |
| admin | gestion > activity | `AdminUserActivity` | N5 | ✅ via `AdminTabContent` |
| admin | franchiseur | `FranchiseurView` | N3 | ✅ via `AdminTabContent` |
| admin | ia | `IAView` | N5 | ✅ via `AdminTabContent` |
| admin | contenu | `ContenuView` | N5 | ✅ via `AdminTabContent` |
| admin | ops > backup | `AdminBackup` | N5 | ✅ via `AdminTabContent` |
| admin | ops > database | `AdminDatabaseExport` | N5 | ✅ via `AdminTabContent` |
| admin | ops > imports | `AdminHelpConfortBackup` | N5 | ✅ via `AdminTabContent` |
| admin | plateforme > modules | `AdminFeatureFlags` | N5 | ✅ via `AdminTabContent` |
| admin | plateforme > health | `AdminSystemHealth` | N5 | ✅ via `AdminTabContent` |
| salaries | — | `RHSuiviContent` | N1 | ✅ via `CollaborateursTabContent` |
| — | Dialog | `ImpersonationDialog` | N5 | ✅ directement |
| — | Dialog | `RealUserImpersonationDialog` | N5 | ✅ directement |

### Routes standalone (déjà protégées étape 4)

| Route | Composant | MFA |
|-------|-----------|-----|
| `/admin/agencies/:id` | `FranchiseurLayout` | ✅ |
| `/admin/support/settings` | `SupportSettings` | ✅ |

## 3. Fichiers modifiés

| Fichier | Action | Justification |
|---------|--------|---------------|
| `src/components/unified/tabs/AdminTabContent.tsx` | **Modifié** | MfaGuard wrapping le contenu admin complet |
| `src/components/unified/tabs/CollaborateursTabContent.tsx` | **Modifié** | MfaGuard protégeant les données RH sensibles |
| `src/components/RealUserImpersonationDialog.tsx` | **Modifié** | MfaGuard dans le dialog d'impersonation réelle |
| `src/components/ImpersonationDialog.tsx` | **Modifié** | MfaGuard dans le dialog d'impersonation simulation |
| `docs/security/final-step5-mfa-effective-coverage.md` | **Créé** | Ce rapport |

## 4. Couverture réelle MFA après cette étape

### ✅ Couvert

- **Tout l'onglet Admin** du workspace unifié (6 sous-onglets, ~20 vues)
- **Données RH sensibles** (SSN, contacts d'urgence, fiches collaborateurs)
- **Exports critiques** (backup JSON/TXT, export DB, imports)
- **Gestion des utilisateurs** (TDR, inscriptions, droits)
- **Impersonation** (simulation et réelle)
- **Modules / Feature flags** (activation/désactivation)
- **Routes standalone admin** (détail agence, support settings)

### ⚠️ Partiellement couvert

- **Données RH sensibles au niveau composant** : Le MfaGuard est sur `CollaborateursTabContent` (onglet entier). Les appels Edge Function `sensitive-data` ne vérifient pas le AAL côté serveur — seul le frontend est protégé.

### ❌ Non couvert (nécessite chantier ultérieur)

| Zone | Raison | Risque |
|------|--------|--------|
| Edge Functions sensibles | Pas de vérification AAL côté serveur | Un appel API direct bypass le MFA frontend |
| RLS policies | Pas de filtre AAL SQL | Hors scope MFA frontend |
| Onglet Ticketing | Accès N0+ — pas sensible au sens MFA | Risque faible |
| Onglet Documents | Accès N1+ — données non critiques | Risque faible |

## 5. Garanties de non-régression

- ✅ **Logins** : Aucun changement au flow de login. Le MFA est une couche post-auth.
- ✅ **Permissions** : RoleGuard et ModuleGuard inchangés. MfaGuard est additionnel.
- ✅ **UX** : En mode `advisory` (actuel), aucun blocage — juste un banner d'incitation.
- ✅ **Composants admin** : Aucune modification de contenu admin. Seuls les wrappers sont ajoutés.
- ✅ **RH** : Les composants RH (`RHSuiviContent`, `useSensitiveData`) sont inchangés.
- ✅ **Rollback** : `MFA_ENFORCEMENT_MODE = 'off'` désactive tout MfaGuard instantanément.

## 6. Limites restantes

| Limite | Impact | Chantier requis |
|--------|--------|----------------|
| **Pas de vérification AAL côté Edge Functions** | Un attaquant avec un token AAL1 peut appeler `sensitive-data`, `export-all-data`, etc. directement | Ajouter vérification `aal` dans `_shared/auth.ts` |
| **MFA non enforced** | Mode advisory = les admins peuvent ignorer le banner | Passer à `enforced` quand tous les admins sont enrollés |
| **Pas de recovery codes** | Si un admin perd son device, recovery via Supabase Dashboard uniquement | Implémenter backup codes |
| **Onglet Collaborateurs protège tous les utilisateurs** | Même les N1 voient le banner MFA (ignorable) car l'onglet contient `useSensitiveData` | Affiner en protégeant uniquement les sous-composants sensibles (`RHCockpitDrawerICE`, etc.) |
