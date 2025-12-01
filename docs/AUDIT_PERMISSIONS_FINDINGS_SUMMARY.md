# RÉSUMÉ FINDINGS – AUDIT PERMISSIONS & NAVIGATION

## 🔴 CRITIQUES (2)

### F-PERM-1 – Support Console Bypass via Module Options ✅ CORRIGÉ
**Impact**: N2 pouvait accéder console support si admin activait `enabled_modules.support.options.agent`  
**Fichiers**: `roleMatrix.ts`, `AuthContext.tsx`  
**Cause**: ROLE_MATRIX définissait N5+ mais AuthContext calculait via module option  
**Fix appliqué**: `canAccessSupportConsole` respecte strictement ROLE_MATRIX (N5+ seulement), pas de bypass via module option

### F-EDIT-1 – EditUserDialog ne modifie PAS global_role/modules
**Impact**: Workflow fragmenté, admin doit utiliser 2 interfaces pour éditer 1 user  
**Fichiers**: `UserDialogs.tsx`, `UserAccordionItem.tsx`  
**Cause**: EditUserDialog = infos basiques, accordion = permissions  
**Fix**: Unifier interface OU clarifier séparation

---

## 🟠 ÉLEVÉS (4)

### F-PERM-2 – Module apogee_tickets invisible en navigation ✅ CORRIGÉ
**Impact**: User avec module activé ne découvrait pas section Projects  
**Fichiers**: `dashboardTiles.ts`, `UnifiedSidebar.tsx`  
**Cause**: Groupe projects sans accessKey ni requiresModule check  
**Fix appliqué**: Filtrage du groupe projects basé sur hasModule('apogee_tickets')

### F-EDIT-2 – Agence modifiable sans vérification scope ✅ CORRIGÉ
**Impact**: Admin N2 voyait TOUTES agences dans dropdown, pouvait choisir hors scope  
**Fichiers**: `AdminUsersUnified.tsx`  
**Cause**: Dropdown non filtré selon manageScope (ownAgency/assignedAgencies)  
**Fix appliqué**: Agences filtrées selon getUserManagementCapabilities - N2 voit sa propre agence, N3 voit agences assignées, N4+ voit tout

### F-EDIT-4 – Module activation sans vérification minRole
**Impact**: Admin peut activer module N3+ pour user N1 (incohérence DB/runtime)  
**Fichiers**: `UserAccordionItem.tsx`  
**Cause**: Switch module ne vérifie pas moduleDef.minRole vs effectiveRole  
**Fix**: Valider canAccessModule() avant toggle

### F-NAV-1 – Tile CONSOLE_SUPPORT filtre incohérent
**Impact**: Flag requiresSupport inutilisé, confusion code  
**Fichiers**: `dashboardTiles.ts`, `Landing.tsx`, `roleMatrix.ts`  
**Cause**: Tile a requiresSupport mais filtre utilise canAccessSupportConsole  
**Fix**: Supprimer requiresSupport, unifier via canAccessSupportConsole

---

## 🟡 MOYENS (6)

### F-PERM-3 – Route /support/console mal protégée ✅ CORRIGÉ
**Fichiers**: `App.tsx` (ligne 217), `SupportConsoleGuard.tsx`  
**Fix appliqué**: Créé SupportConsoleGuard dédié vérifiant canAccessSupportConsole (N5+ strictement)

### F-PERM-4 – base_user (N0) voit tiles Support
**Question**: Est-ce que N0 DOIT pouvoir créer tickets support ?  
**Fix**: Si non, canAccessSupport: false pour N0

### F-EDIT-3 – role_agence toujours disabled
**Cause**: canEditRoleAgence prop non passé  
**Fix**: Passer flag dans AdminUsersUnified → EditUserDialog

### F-NAV-2 – Route guard cohérence
**Duplication de F-PERM-3**

### F-NAV-3 – Groupe projects sans check module
**Duplication de F-PERM-2**

### F-NAV-4 – requiresFranchisor non vérifié
**Cause**: Flag requiresFranchisor ignoré dans Landing filter  
**Fix**: Ajouter vérification GLOBAL_ROLES >= franchisor_user

### F-NAV-6 – Tiles admin visibles N5+ mais routes N3+
**Question**: Est-ce que N3-N4 doivent voir section Admin réduite ?  
**Fix**: Option A (restrict N5+) ou Option B (visibilité partielle N3+)

### F-MISC-1 – Documents scopeSlug incorrect ✅ CORRIGÉ
**Fix appliqué**: Changé 'helpconfort' → 'base_documentaire'

### F-MISC-2 – RH_TECH/MON_EQUIPE scopeSlug incorrect ✅ CORRIGÉ
**Fix appliqué**: Créé scopes dédiés 'rh_tech' et 'mon_equipe' (anciennement 'mes_indicateurs')

---

## ⚡ ACTIONS IMMÉDIATES RECOMMANDÉES

### Phase 1 – Sécurité (4h)
1. ✅ **CORRIGÉ** - Décider architecture Support Console (modulaire vs strict N5+) → **Strict N5+ imposé**
2. ✅ **CORRIGÉ** - Implémenter validation minRole dans module activation (F-EDIT-4)
3. ✅ **CORRIGÉ** - Filtrer agences selon manageScope dans EditUserDialog (F-EDIT-2)

### Phase 2 – Cohérence Navigation (3h)
4. ✅ **CORRIGÉ** - Ajouter requiresModule check pour groupe Projects (F-PERM-2, F-NAV-3)
5. ✅ **CORRIGÉ** - Créer SupportConsoleGuard pour /support/console (F-PERM-3, F-NAV-2)
6. ✅ **CORRIGÉ** - Corriger scopeSlug tiles (F-MISC-1, F-MISC-2)

### Phase 3 – UX Admin (6h)
7. ⏳ Unifier EditUserDialog + UserAccordionItem (F-EDIT-1)
8. ⏳ Passer canEditRoleAgence prop (F-EDIT-3)
9. ⏳ Décider visibilité admin tiles pour N3-N4 (F-NAV-6)

### Phase 4 – Documentation (2h)
10. ⏳ Créer table de vérité permissions par rôle
11. ⏳ Documenter guards et leur usage
12. ⏳ Mettre à jour DOC_PERMISSIONS.md

---

**Total findings**: 12 (dont 3 duplications, donc 9 uniques)  
**Effort estimé**: 15h-22h selon décisions architecturales
