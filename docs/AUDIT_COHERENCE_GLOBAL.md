# 🔍 AUDIT DE COHÉRENCE GLOBAL - Guide-Apogée-Dev

**Date**: 2025-12-01  
**Scope**: Alignement complet des droits, pages, modules, navigation, RLS, métier, formulaires  
**Objectif**: Identifier et corriger TOUTES les incohérences système

---

## 📋 MÉTHODOLOGIE

Cet audit vérifie la cohérence entre :
1. ✅ **Droits & Permissions** (roleMatrix vs modules vs RLS)
2. ✅ **Pages** (routes vs guards vs affichage)
3. ✅ **Formulaires** (validation client vs serveur)
4. ✅ **Modules** (définition vs usage vs activation)
5. ✅ **Navigation** (sidebar vs tiles vs permissions)
6. ✅ **RLS vs Interface** (policies DB vs contrôles frontend)
7. ✅ **Logique Métier** (cohérence inter-modules)
8. ✅ **Édition/Lecture** (permissions modify vs read)

---

## 🚨 INCOHÉRENCES CRITIQUES DÉTECTÉES

### I-PERM-1: Support Console - Confusion rôle N5+ vs module.agent

**Fichiers concernés**: 
- `src/config/roleMatrix.ts` (ligne 29, 125-126)
- `src/contexts/AuthContext.tsx` (lignes 120-127)
- `src/types/accessControl.ts` (lignes 69-78)

**Symptôme**: 
- `roleMatrix.ts` déclare `canAccessSupportConsole: true` UNIQUEMENT pour N5+ (platform_admin, superadmin)
- `AuthContext.tsx` calcule `isSupportAgent = isSuperAdmin || supportOptions.agent === true`
- Puis fixe `canAccessSupportConsole = baselineCanAccessConsole` (N5+ SEULEMENT)
- **CONTRADICTION**: `isSupportAgent` peut être true pour N3/N4 avec module support.agent, MAIS `canAccessSupportConsole` reste false pour ces rôles

**Confusion sémantique**:
- `isSupportAgent` indique "peut répondre aux tickets" (module option)
- `canAccessSupportConsole` indique "peut accéder à /support/console" (rôle N5+)
- Ces deux concepts sont différents mais mal nommés, créant la confusion

**Impact**:
- Un N3 avec support.agent=true aura `isSupportAgent=true` mais `canAccessSupportConsole=false`
- Navigation/tiles utilisent `isSupportAgent` (donc visible pour N3)
- Mais RoleGuard sur route /support/console utilise N5+ (donc blocage N3)
- **BUG POTENTIEL**: UI montre accès, mais route bloque

**Solution recommandée**:
- Soit: Renommer `isSupportAgent` → `hasAgentRole` et `canAccessSupportConsole` → `canAccessConsole`
- Soit: Décider définitivement: console = N5+ strict (supprimer module.agent) OU console = module.agent (ouvrir à N3+)
- Documenter explicitement la politique d'accès console support

---

### I-PERM-2: Tiles CONSOLE_SUPPORT - Dual check incohérent

**Fichiers concernés**: 
- `src/config/dashboardTiles.ts` (ligne 140)
- `src/config/roleMatrix.ts` (lignes 500-502)

**Symptôme**:
```typescript
// dashboardTiles.ts
{
  id: 'CONSOLE_SUPPORT',
  requiresSupport: true,  // Flag binaire
  ...
}

// roleMatrix.ts canAccessTile()
case 'CONSOLE_SUPPORT':
  return options?.canAccessSupportConsole ?? caps.canAccessSupportConsole;
```

**Problème**:
- La tuile utilise `requiresSupport: true` (flag générique)
- Mais `canAccessTile()` vérifie `canAccessSupportConsole` (N5+ strict)
- `Landing.tsx` filtre les tuiles avec logique personnalisée, pas via `canAccessTile()`

**Impact**:
- Si on passe par `canAccessTile()`, la tile respecte N5+
- Si on passe par filtre manuel dans Landing, ça dépend de l'implémentation
- Risque de divergence selon le point d'entrée

**Solution recommandée**:
- Unifier: soit `requiresSupportConsole: true` partout, soit supprimer le flag et utiliser `canAccessTile()` systématiquement
- Documenter la logique de filtrage des tiles

---

### I-NAV-1: Scope strings non standardisés

**Fichiers concernés**:
- `src/config/navigation.ts` (scopes: apogee, apporteurs, helpconfort, mes_indicateurs, actions_a_mener, diffusion, franchiseur_dashboard, etc.)
- `src/config/dashboardTiles.ts` (scopeSlug: apogee, apporteurs, base_documentaire, mes_indicateurs, etc.)
- Aucun enum TypeScript central

**Symptôme**:
Navigation utilise des strings arbitraires pour `scope`:
- `'apogee'`, `'apporteurs'`, `'helpconfort'`, `'mes_indicateurs'`, `'actions_a_mener'`
- Pas de validation TypeScript = risque de typo silencieuse

**Problème**:
- `navigation.ts` utilise `scope?: string` sans type strict
- `dashboardTiles.ts` utilise `scopeSlug: string` sans validation
- Aucun lien type-safe entre scopeSlug et ModuleKey
- `hasAccessToScope()` fait un mapping manuel string → check

**Impact**:
- Typo dans scope string = feature invisible sans erreur
- Ajout de nouveau scope = oubli facile de l'ajouter dans `hasAccessToScope()`
- Difficulté à tracer où chaque scope est utilisé

**Solution recommandée**:
- Créer enum `ScopeSlug` TypeScript avec tous les scopes valides
- Typer `scope: ScopeSlug` et `scopeSlug: ScopeSlug` partout
- Créer mapping type-safe `SCOPE_TO_MODULE: Record<ScopeSlug, ModuleKey | null>`

---

### I-NAV-2: hasAccessToScope() - Logique redondante avec V2

**Fichier concerné**: `src/contexts/AuthContext.tsx` (fonction `hasAccessToScope`)

**Symptôme**:
```typescript
const hasAccessToScope = useCallback((scope: string): boolean => {
  switch (scope) {
    case 'apogee': return hasModuleOption('help_academy', 'apogee');
    case 'apporteurs': return hasModuleOption('help_academy', 'apporteurs');
    ...
    case 'mes_indicateurs': return hasModule('pilotage_agence');
    ...
  }
}, [accessContext]);
```

**Problème**:
- Fonction de compatibilité qui devrait être dépréciée
- Maintenue "temporairement" mais utilisée dans 10+ pages
- Logique dupliquée avec les guards V2 (`hasModule`, `hasModuleOption`)
- Ajout d'un nouveau scope = modifier switch manuellement

**Impact**:
- Dette technique persistante
- Source de bugs si scope ajouté sans mise à jour du switch
- Confusion pour les devs (quelle fonction utiliser?)

**Solution recommandée**:
- Déprécier formellement avec JSDoc `@deprecated`
- Migrer progressivement les pages vers guards V2
- Supprimer complètement après migration

---

### I-GUARD-1: Guards absents sur certaines pages

**Pages sans guards détectées**:
- `src/pages/CategoryPage.tsx` → utilise `hasAccessToScope` (legacy) au lieu de RoleGuard
- `src/pages/ApogeeGuide.tsx` → check manuel `if (!isAuthenticated)` au lieu de guard
- `src/pages/HelpConfort.tsx` → check manuel au lieu de guard
- `src/pages/ApporteurGuide.tsx` → check manuel au lieu de guard
- `src/pages/CategoryApporteur.tsx` → check manuel au lieu de guard
- `src/pages/CategoryActionsAMener.tsx` → check manuel au lieu de guard

**Symptôme**:
Pages implémentent leur propre logique de redirection:
```tsx
if (!isAuthenticated) return <Navigate to="/" replace />;
if (!hasAccessToScope('apogee')) return <Navigate to="/" replace />;
```

**Problème**:
- `App.tsx` définit des routes avec RoleGuard/ModuleGuard
- MAIS certaines pages ajoutent des checks redondants
- Certaines pages n'ont AUCUN guard dans App.tsx et font tout manuellement

**Impact**:
- Logique d'accès fragmentée (certaines dans App.tsx, d'autres dans page component)
- Difficile de tracer qui peut accéder à quoi
- Redondance = risque de désynchronisation

**Solution recommandée**:
- **Politique unique**: TOUS les guards dans `App.tsx` via RoleGuard/ModuleGuard
- Supprimer TOUS les checks manuels `if (!isAuthenticated)` dans les pages
- Pages assument qu'elles sont déjà protégées par App.tsx

---

### I-GUARD-2: ModuleGuard vs requiresModule - Deux systèmes parallèles

**Fichiers concernés**:
- `src/App.tsx` (utilise ModuleGuard wrapper)
- `src/config/dashboardTiles.ts` (utilise requiresModule flag)
- `src/pages/Landing.tsx` (filtre les tiles manuellement)

**Symptôme**:
Deux mécanismes de contrôle d'accès module:
1. `ModuleGuard` component dans routes (App.tsx)
2. `requiresModule` flag dans tiles + filtrage manuel (Landing.tsx)

**Problème**:
- Guards dans routes protègent l'accès URL direct
- Tiles filtering empêche l'affichage UI
- Les deux doivent être synchronisés manuellement
- Aucun test automatique que tile.requiresModule === route.ModuleGuard

**Impact**:
- Ajout d'une nouvelle page module = deux endroits à mettre à jour
- Risque d'oubli: tile visible mais route inaccessible (ou inverse)

**Solution recommandée**:
- Générer guards automatiquement depuis dashboardTiles configuration
- OU centraliser dans config: `PROTECTED_ROUTES: Record<string, { minRole?, requiredModule? }>`
- Synchronisation automatique entre tiles et routes

---

### I-MODULE-1: Scopes navigation != Module keys

**Fichiers concernés**:
- `src/config/navigation.ts` (scope: 'mes_indicateurs', 'actions_a_mener', 'diffusion')
- `src/types/modules.ts` (ModuleKey: 'pilotage_agence')

**Symptôme**:
```typescript
// navigation.ts
{ scope: 'mes_indicateurs' }  // String arbitraire
{ scope: 'actions_a_mener' }
{ scope: 'diffusion' }

// modules.ts
export const MODULES = {
  pilotage_agence: 'pilotage_agence',  // Clé de module
}

// MODULE_OPTIONS
pilotage_agence: {
  indicateurs: 'pilotage_agence.indicateurs',
  actions_a_mener: 'pilotage_agence.actions_a_mener',
  diffusion: 'pilotage_agence.diffusion',
}
```

**Problème**:
- Navigation scope = string plat non typé
- Module system = structure hiérarchique typée
- `hasAccessToScope('mes_indicateurs')` fait mapping manuel vers `hasModule('pilotage_agence')`
- Pas de lien type-safe entre les deux

**Impact**:
- Risque de typo (mes_indicateur vs mes_indicateurs)
- Difficulté à tracer dépendances scope → module
- Ajout d'un module = mettre à jour mapping manuellement

**Solution recommandée**:
- Soit: Supprimer navigation.scope, utiliser directement moduleKey + optionKey
- Soit: Créer `SCOPE_REGISTRY: Record<ScopeSlug, { module: ModuleKey, option?: string }>`
- Générer hasAccessToScope dynamiquement depuis registry

---

### I-MODULE-2: enabled_modules structure - Boolean vs Object inconsistency

**Fichier concerné**: `src/types/modules.ts` (lignes 174-186)

**Symptôme**:
```typescript
export interface EnabledModules {
  help_academy?: boolean | ModuleOptionsState;
  pilotage_agence?: boolean | ModuleOptionsState;
  support?: boolean | ModuleOptionsState;
  ...
}

export interface ModuleOptionsState {
  enabled: boolean;
  options?: Record<string, boolean>;
}
```

**Problème**:
- Un module peut être `true` (legacy?) OU `{ enabled: true, options: {...} }` (V2)
- Fonctions `isModuleEnabled()` et `isModuleOptionEnabled()` gèrent les deux
- **AUCUNE validation** que la DB contient le bon format
- Migration legacy → V2 jamais finalisée?

**Impact**:
- Confusion: quel format utiliser lors de la création d'utilisateur?
- AdminUsersUnified définit-il boolean ou object?
- Risque de bugs si certains users ont boolean, d'autres object

**Solution recommandée**:
- **Décision**: Forcer format V2 objet uniquement
- Migration DB: UPDATE profiles SET enabled_modules = format V2 WHERE format = boolean
- Supprimer checks de compatibilité boolean
- Documenter format JSONB canonique

---

### I-MODULE-3: MODULE_DEFINITIONS defaults vs réalité DB

**Fichier concerné**: `src/types/modules.ts` (lignes 85-171)

**Symptôme**:
```typescript
{
  key: 'help_academy',
  defaultForRoles: ['franchisee_user', 'franchisee_admin', ...],
  options: [
    { key: 'apogee', defaultEnabled: true },
    { key: 'helpconfort', defaultEnabled: false },  // ⚠️
  ]
}
```

**Questions non résolues**:
1. Qui applique ces defaults lors de la création utilisateur?
   - AdminUsersUnified.tsx?
   - Trigger DB?
   - Edge function?

2. Les users existants ont-ils ces defaults?
   - Certains N1 ont-ils help_academy absent en DB?
   - Fallback: si module absent, utiliser defaults runtime?

3. Migration V1→V2: defaults appliqués rétroactivement?

**Problème**:
- `MODULE_DEFINITIONS` définit des defaults mais aucune garantie qu'ils sont appliqués
- `getDefaultModulesForRole()` génère la structure mais qui l'appelle?
- Risque: DB incohérente avec les supposés "defaults"

**Impact**:
- User N1 créé pourrait ne PAS avoir help_academy en DB
- Code suppose que N1 a help_academy par défaut
- Runtime check manquant?

**Solution recommandée**:
- Audit DB: `SELECT id, global_role, enabled_modules FROM profiles WHERE global_role IN ('franchisee_user', 'franchisee_admin') AND enabled_modules IS NULL OR enabled_modules = '{}'`
- Vérifier que tous les N1+ ont help_academy activé
- Documenter: defaults appliqués à la création OU en runtime fallback?

---

### I-FORM-1: Formulaire création utilisateur - Modules defaults

**Fichier concerné**: `src/pages/AdminUsersUnified.tsx`

**Question**:
Lors de la création d'un nouveau user, le formulaire définit-il automatiquement les enabled_modules selon le global_role choisi?

**À vérifier**:
- Le hook `useAdminUsers.ts` appelle-t-il `getDefaultModulesForRole(newRole)` lors du INSERT?
- Ou bien l'admin doit-il manuellement cocher les modules après assignation du rôle?

**Impact si non géré**:
- User N1 créé avec enabled_modules = {} → aucun accès
- Admin doit éditer une 2ème fois pour activer modules = UX lourde

**Action requise**:
- Vérifier logique de création dans `use-admin-users.ts`
- Confirmer que defaults sont appliqués automatiquement
- Si absent, ajouter: `enabled_modules: getDefaultModulesForRole(formData.global_role)`

---

### I-FORM-2: Validation password - Dualité frontend/backend

**Contexte**: Mémoire `security/password-validation-uniform-enforcement`

**Symptôme**:
- Frontend valide: 8+ chars, majuscule, minuscule, chiffre, symbole
- Backend Supabase Auth: valide selon config (historiquement 6 chars minimum)

**Question**:
- `supabase/config.toml` définit-il `password_min_length = 8` et `password_required_characters`?
- Si non configuré, backend acceptera 6 chars alors que frontend demande 8

**Impact**:
- Incohérence validation = frustration utilisateur
- Contournement validation frontend via API directe

**Action requise**:
- Vérifier `supabase/config.toml` section `[auth]`
- S'assurer password_min_length = 8
- S'assurer password_required_characters = ["upper", "lower", "number", "symbol"]

---

### I-RLS-1: RLS support_tickets - Console access N5+ vs module.agent

**Table concernée**: `support_tickets`

**Symptôme**:
- RLS policies permettent SELECT/UPDATE/DELETE selon diverses conditions
- Mais AUCUNE policy ne vérifie explicitement `has_min_global_role(auth.uid(), 5)` pour console access
- Policies actuelles: ticket owner, assigned_to, ou admin

**Question**:
- Si un N3 avec module support.agent=true fait une query, la RLS autorise-t-elle?
- Ou bien la RLS est-elle plus permissive que le guard frontend N5+?

**Impact potentiel**:
- **DÉSALIGNEMENT RLS/UI**: Frontend cache console pour N3, mais si N3 bypass UI et call API direct, RLS pourrait autoriser
- Faille de sécurité si RLS plus permissive que UI

**Action requise**:
- Auditer TOUTES les policies sur support_tickets
- Vérifier si RLS check rôle N5+ OU si RLS utilise module/role différent
- Aligner RLS sur politique d'accès officielle (N5+ strict)

---

### I-RLS-2: Table franchiseur_roles - Usage unclear

**Table**: `franchiseur_roles`

**Colonnes**:
- user_id
- franchiseur_role (animateur, directeur, dg)
- permissions (JSONB)

**Questions**:
1. Cette table est-elle encore utilisée en V2.0?
2. `franchiseur_role` fait-il doublon avec profiles.global_role (franchisor_user, franchisor_admin)?
3. Colonne `permissions` JSONB = système legacy?

**Symptôme**:
- Fonctions RLS: `has_franchiseur_role(_user_id, 'directeur')` vérifient cette table
- Mais V2.0 utilise `profiles.global_role` pour hiérarchie
- Risque de conflit: user avec global_role=franchisor_user mais franchiseur_roles vide?

**Impact**:
- Si franchiseur_roles non remplie, `has_franchiseur_role()` retourne false
- RLS policies échouent même si global_role devrait autoriser
- Désynchronisation entre deux sources de vérité

**Solution recommandée**:
- **Clarifier**: franchiseur_roles est-elle legacy à supprimer?
- Si oui: migrer RLS policies vers has_min_global_role()
- Si non: documenter quand/comment cette table est remplie
- Vérifier cohérence: tous les N3+ ont-ils un row dans franchiseur_roles?

---

### I-RLS-3: Policies agency_collaborators - Agence matching complex

**Table**: `agency_collaborators`

**Policy READ**:
```sql
(has_min_global_role(auth.uid(), 3) OR 
 (agency_id = (SELECT profiles.agency_id FROM profiles WHERE id = auth.uid())) OR
 (agency_id IN (SELECT aa.id FROM apogee_agencies aa WHERE aa.slug = (SELECT profiles.agence FROM profiles WHERE id = auth.uid()))))
```

**Problème**:
- Trois mécanismes de matching: global_role, agency_id FK, agence slug
- `profiles.agency_id` (UUID FK) ET `profiles.agence` (slug string) coexistent
- Laquelle est source de vérité?

**Questions**:
- Pourquoi deux champs (agency_id ET agence)?
- Sont-ils toujours synchronisés?
- Migration incompléte de agence → agency_id?

**Impact**:
- Si agency_id NULL mais agence rempli: 2ème condition échoue, fallback sur 3ème
- Complexité inutile, performance requêtes dégradée
- Risque d'incohérence si agency_id et agence.slug désynchronisés

**Solution recommandée**:
- **Standardiser**: choisir UN SEUL champ (recommandé: agency_id UUID FK)
- Supprimer agence string slug de profiles
- Simplifier RLS: `agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())`
- Migration: remplir agency_id depuis agence slug pour tous les users

---

### I-RLS-4: Franchiseur policies - assignedAgencies orphan logic

**Tables concernées**: Royalties, animator_visits, etc.

**Policy exemple (agency_royalty_calculations)**:
```sql
(has_franchiseur_role(auth.uid(), 'directeur') OR 
 has_franchiseur_role(auth.uid(), 'dg') OR 
 has_min_global_role(auth.uid(), 5))
```

**Problème**:
- RLS ne check PAS les agency assignments (table franchiseur_agency_assignments)
- Policy dit: "directeur/dg voit TOUT", pas "directeur voit ses agences assignées"

**Mais**:
- Frontend filtre selon assigned agencies (FranchiseurHome.tsx, etc.)
- **DÉSALIGNEMENT**: RLS authorise tout, frontend restreint

**Impact**:
- Directeur peut bypass UI et query toutes les agences via API directe
- Sécurité: RLS trop permissive, se repose sur frontend filtering
- **FAILLE**: Si dev oublie de filtrer dans nouveau component, leak data

**Solution recommandée**:
- Renforcer RLS policies: 
  ```sql
  (has_min_global_role(5) OR 
   (has_franchiseur_role('directeur') AND EXISTS (
     SELECT 1 FROM franchiseur_agency_assignments 
     WHERE user_id = auth.uid() AND agency_id = agency_royalty_calculations.agency_id
   )))
  ```
- Appliquer sur TOUTES les tables multi-agency

---

### I-DATA-1: Context_type RAG - 7 valeurs autorisées mais éparpillées

**Fichier conceptuel**: Aucun registry centralisé

**Valeurs autorisées** (mémoire `architecture/rag-context-types-authorized-strict`):
- `'apogee'`, `'apporteurs'`, `'helpconfort'`, `'metier'`, `'franchise'`, `'documents'`, `'auto'`

**Problème**:
- Ces valeurs existent comme contrainte métier mais PAS comme enum TypeScript
- Chaque dropdown/select les redéfinit manuellement
- `guide_chunks.metadata->>'context_type'` stocke string non validé

**Risque**:
- Typo lors de l'insertion: `'apoge'` au lieu de `'apogee'` → chunk orphelin
- Nouveau dev ajoute `'juridique'` sans savoir que c'est interdit
- Aucun lint/type check sur ces valeurs

**Solution recommandée**:
- Créer enum TypeScript: `export type RagContextType = 'apogee' | 'apporteurs' | ...`
- Créer enum DB: `CREATE TYPE rag_context_type AS ENUM (...)`
- Colonne guide_chunks: `context_type rag_context_type NOT NULL`
- Typer tous les selects/dropdowns avec RagContextType

---

### I-DATA-2: Apogée agencies - slug vs agency_id dualité

**Tables concernées**: `apogee_agencies`, `profiles`

**Colonnes**:
- `profiles.agence` (text slug) → "dax", "auch", etc.
- `profiles.agency_id` (uuid FK) → référence vers apogee_agencies.id

**Symptôme**:
- Deux champs pour représenter la même relation
- `agence` slug utilisé pour API calls Apogée
- `agency_id` utilisé pour FK relationnelles

**Problème**:
- Redondance: les deux doivent être synchronisés
- Quelle est la source de vérité lors d'une modification?
- Si admin change slug dans apogee_agencies, faut-il UPDATE profiles.agence?

**Impact**:
- Risque désynchronisation: agency_id pointe vers agence A, mais agence slug pointe vers B
- Logique métier fragile (certains codes utilisent slug, d'autres UUID)

**Solution recommandée**:
- **Standardiser**: garder SEULEMENT `profiles.agency_id` (UUID FK)
- Supprimer `profiles.agence` (slug)
- Quand besoin du slug: JOIN avec apogee_agencies
- Nettoyer tous les codes qui utilisent profiles.agence

---

### I-UI-1: Dashboard tiles filtering - Logique dupliquée

**Fichier concerné**: `src/pages/Landing.tsx`

**Symptôme**:
```typescript
const filteredTiles = DASHBOARD_TILES.filter(tile => {
  // Vérif group
  if (!canAccessTileGroup(...)) return false;
  
  // Vérif module
  if (tile.requiresModule) {
    if (!isAdmin && !isModuleEnabled(...)) return false;
  }
  
  // Vérif requiresSupport
  // Vérif requiresFranchisor
  // Vérif requiresAdmin
  ...
})
```

**Problème**:
- Logique de filtrage réimplémentée dans Landing.tsx
- Existe AUSSI dans `roleMatrix.ts` (`canAccessTile`, `canAccessTileGroup`)
- Duplication = risque de divergence

**Impact**:
- Modification logique d'accès = deux endroits à changer
- Si un dev update Landing mais oublie roleMatrix (ou inverse), comportement incohérent

**Solution recommandée**:
- Utiliser `canAccessTile()` de roleMatrix dans Landing
- Supprimer logique custom dans Landing
- OU inverser: supprimer canAccessTile(), utiliser seulement Landing logic
- Documenter source de vérité unique

---

### I-UI-2: UnifiedSidebar - Dual filtering mechanism

**Fichier concerné**: `src/components/layout/UnifiedSidebar.tsx`

**Symptôme**:
```typescript
const getFilteredItems = (items: NavItem[]): NavItem[] => {
  return items.filter(item => {
    if (item.requiresSupportConsole && !canAccessSupportConsole) return false;
    if (!item.minRole) return true;
    const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
    const requiredLevel = GLOBAL_ROLES[item.minRole];
    return userLevel >= requiredLevel;
  });
};
```

**Problème**:
- Sidebar filtre selon `minRole` et `requiresSupportConsole`
- Navigation items (navigation.ts) utilisent `scope` string
- **AUCUN LIEN** entre navigation.scope et tile filtering
- Sidebar et Dashboard utilisent des mécanismes différents

**Impact**:
- Feature visible dans dashboard, invisible dans sidebar (ou inverse)
- Confusion utilisateur: "pourquoi la tuile est là mais pas le menu?"

**Solution recommandée**:
- Unifier: tous les items (sidebar + tiles) utilisent la même interface
- Single filtering function: `isFeatureAccessible(item, authContext)`
- Appliquer partout (sidebar, dashboard, breadcrumbs)

---

### I-ROUTE-1: Routes protégées - Guards incomplets

**Audit des routes dans App.tsx**:

**Routes AVEC guards** ✅:
- `/admin/*` → RoleGuard minRole="platform_admin"
- `/tete-de-reseau/*` → RoleGuard minRole="franchisor_user"
- `/pilotage/indicateurs/*` → ModuleGuard moduleKey="pilotage_agence"
- `/support/console` → SupportConsoleGuard
- `/projects/*` → ModuleGuard moduleKey="apogee_tickets"

**Routes SANS guards** ⚠️:
- `/apogee` → Aucun guard, check manuel dans page
- `/apporteur/*` → Aucun guard, check manuel
- `/helpconfort/*` → Aucun guard, check manuel
- `/pilotage/actions` → Aucun guard?
- `/pilotage/diffusion` → Aucun guard?

**Problème**:
- Incohérence: certaines pages protégées par guard, d'autres par check interne
- Difficile d'auditer "qui peut accéder à quoi" sans lire chaque page

**Solution recommandée**:
- **Politique**: 100% des routes protégées par guards dans App.tsx
- Supprimer TOUS les checks `if (!isAuthenticated)` dans pages
- Pages assument qu'elles sont accessibles (guards fait le tri)

---

### I-ROUTE-2: Hub pages - Guards manquants

**Pages hub créées récemment**:
- `/academy` → AcademyIndex
- `/pilotage` → PilotageIndex  
- `/reseau` → ReseauIndex
- `/support` → SupportIndex
- `/admin` → AdminIndex
- `/projects` → ProjectsIndex

**Question**:
Ces hub pages ont-elles des guards dans App.tsx?

**À vérifier**:
- `/academy` devrait requérir help_academy module
- `/pilotage` devrait requérir pilotage_agence module
- `/reseau` devrait requérir N3+ (franchisor_user)
- `/admin` devrait requérir N5+ (platform_admin)

**Impact si absent**:
- User sans permission pourrait voir hub page vide (UX confuse)
- OU hub page redirige manuellement (incohérence pattern)

**Solution recommandée**:
- Ajouter guards explicites pour tous les hubs
- Hub page ne fait AUCUN check, assume qu'elle est accessible

---

### I-LOGIC-1: Support tickets vs Apogée tickets - Priority scale

**Mémoire**: `architecture/priority-system-unified-heat-0-12`

**Décision prise**: Unifier sur heat scale 0-12 partout

**État actuel**:

**support_tickets**:
- Colonne: `heat_priority` (integer 0-12) ✅
- Triggers: `calculate_ticket_due_at_v2(heat_priority)` ✅
- Frontend: Badges heat-based ✅

**apogee_tickets**:
- Colonne: `heat_priority` (integer 0-12) ✅
- Colonne LEGACY: `priority` (text: 'bloquant', 'urgent', ...) ⚠️
- Frontend: Utilise-t-il heat_priority ou priority text?

**Problème**:
- Si apogee_tickets conserve `priority` text ET `heat_priority`, risque d'incohérence
- Quel champ est affiché dans Kanban?
- Quel champ est utilisé pour tri/filtres?

**Action requise**:
- Auditer apogee_tickets: colonnes priority vs heat_priority
- Si les deux existent, supprimer `priority` text
- Vérifier que Kanban/List utilisent heat_priority exclusivement

---

### I-LOGIC-2: Modules activation - Auto-assignment Tête de réseau

**Mémoire**: `authorization/tete-de-reseau-dual-role-auto-assignment`

**Règle**: role_agence='Tête de réseau' → auto-assign franchiseur + support modules

**Question**:
Cette logique est-elle implémentée?

**À vérifier**:
- Hook `use-admin-users.ts` lors de l'UPDATE role_agence
- Si role_agence = 'Tête de réseau', le code active-t-il automatiquement:
  - global_role = franchisor_user (ou franchisor_admin)?
  - enabled_modules.support.agent = true?

**Impact si absent**:
- Admin doit manuellement activer les modules après assignation du poste
- Incohérence avec la mémoire établie
- UX lourde

**Solution recommandée**:
- Vérifier présence de cette logique dans `use-admin-users.ts`
- Si absente, implémenter l'auto-assignment
- Documenter: "Tête de réseau = auto franchiseur + support"

---

### I-LOGIC-3: Agency visibility - Animateur vs Directeur

**Mémoires**:
- `authorization/franchiseur-directeur-agency-visibility-scoped`
- `database/apogee-agencies-many-to-many-animateur-directeur-roles`

**Règles établies**:
- Animateur avec assignments → voit SEULEMENT agences assignées
- Animateur sans assignments → voit TOUTES
- Directeur avec assignments → voit SEULEMENT agences assignées
- Directeur sans assignments → voit TOUTES

**Question**:
Cette logique est-elle cohérente avec RLS policies?

**RLS actuelle (apogee_agencies)**:
```sql
SELECT WHERE (
  has_min_global_role(5) OR 
  has_support_access() OR 
  has_franchiseur_access() OR 
  slug = get_user_agency()
)
```

**Problème**:
- RLS ne vérifie PAS franchiseur_agency_assignments
- `has_franchiseur_access()` retourne true si N3+, SANS vérifier assignments
- **DÉSALIGNEMENT**: Frontend filtre selon assignments, RLS autorise tout

**Impact**:
- Animateur assigné à DAX+AUCH pourrait query PAU via API directe (RLS autorise)
- Frontend cache PAU, mais RLS ne bloque pas
- **FAILLE SÉCURITÉ**: Filtering frontend != enforcement backend

**Solution recommandée**:
- Durcir RLS:
  ```sql
  (has_min_global_role(5) OR
   (has_franchiseur_access() AND (
     NOT EXISTS (SELECT 1 FROM franchiseur_agency_assignments WHERE user_id = auth.uid())
     OR
     id IN (SELECT agency_id FROM franchiseur_agency_assignments WHERE user_id = auth.uid())
   )))
  ```

---

### I-DATA-3: MonthlyCAChart - Hardcoded data structure

**Fichier**: `src/apogee-connect/components/widgets/MonthlyCAChart.tsx`

**Symptôme**:
```tsx
interface MonthlyCAChartProps {
  data: Array<{
    month: string;
    ca: number;
    nbFactures: number;
  }>;
}

<h3>Chiffre d'affaires mensuel 2025</h3>  // ⚠️ Hardcoded year
```

**Problème**:
- Titre hardcode "2025"
- Pas de prop pour year dynamique
- Si on passe à 2026, le chart affichera toujours "2025"

**Impact**:
- Outdated display
- Code non réutilisable pour multi-year

**Solution recommandée**:
- Ajouter prop `year: number` ou dériver de `data` (min/max date)
- Titre: `Chiffre d'affaires mensuel ${year}`

---

## ✅ COHÉRENCES VALIDÉES

### ✅ C-PERM-1: ROLE_MATRIX vs GLOBAL_ROLES alignment

**Fichiers**: `src/config/roleMatrix.ts`, `src/types/globalRoles.ts`

**Vérifié**: Les 7 rôles (N0-N6) sont cohérents entre:
- GLOBAL_ROLES enum
- ROLE_MATRIX keys
- Mapping numérique 0-6

**Aucune incohérence détectée** ✅

---

### ✅ C-PERM-2: Module definitions structure

**Fichier**: `src/types/modules.ts`

**Vérifié**:
- 6 modules définis: help_academy, pilotage_agence, reseau_franchiseur, support, admin_plateforme, apogee_tickets
- Chaque module a defaultForRoles, minRole, options
- Structure cohérente

**Aucune incohérence détectée** ✅

---

### ✅ C-NAV-1: Dashboard groups aligned

**Fichier**: `src/config/dashboardTiles.ts`

**Vérifié**:
- 6 groups: help_academy, pilotage, support, projects, franchiseur, admin
- DASHBOARD_GROUPS définit title, icon, indexUrl pour chaque
- Tiles référencent ces groups

**Aucune incohérence détectée** ✅

---

## 📝 ACTIONS RECOMMANDÉES PAR PRIORITÉ

### 🔥 PRIORITÉ 1 - SÉCURITÉ CRITIQUE

1. **I-RLS-4**: Durcir RLS policies franchiseur avec agency assignments check
2. **I-RLS-1**: Aligner RLS support_tickets avec politique N5+ console
3. **I-LOGIC-3**: Renforcer agency visibility RLS selon assignments

### ⚠️ PRIORITÉ 2 - INCOHÉRENCES FONCTIONNELLES

4. **I-PERM-1**: Clarifier canAccessSupportConsole vs isSupportAgent
5. **I-GUARD-1**: Migrer tous les guards dans App.tsx, supprimer checks manuels
6. **I-MODULE-1**: Créer registry scope → module type-safe
7. **I-RLS-2**: Décider statut table franchiseur_roles (legacy à supprimer?)
8. **I-MODULE-2**: Forcer format V2 objet pour enabled_modules (migration DB)

### 📊 PRIORITÉ 3 - QUALITÉ CODE

9. **I-NAV-1**: Créer enum ScopeSlug TypeScript
10. **I-DATA-1**: Créer enum RagContextType
11. **I-UI-1**: Unifier tile filtering (un seul mechanism)
12. **I-DATA-2**: Supprimer profiles.agence, garder seulement agency_id FK
13. **I-NAV-2**: Déprécier hasAccessToScope(), migrer vers guards V2

### 🧹 PRIORITÉ 4 - DETTE TECHNIQUE

14. **I-GUARD-2**: Automatiser synchronisation tiles ↔ route guards
15. **I-UI-2**: Unifier filtering sidebar vs dashboard
16. **I-FORM-1**: Vérifier auto-application des module defaults
17. **I-DATA-3**: MonthlyCAChart year dynamique

---

## 🎯 SYNTHÈSE DES DOMAINES

| Domaine | Incohérences | Critiques | État |
|---------|--------------|-----------|------|
| Permissions & Rôles | 3 | 1 | ⚠️ Clarification requise |
| Pages & Guards | 3 | 2 | 🔥 Migration nécessaire |
| Modules System | 3 | 1 | ⚠️ Standardisation requise |
| RLS Policies | 4 | 3 | 🔥 Durcissement critique |
| Navigation & Tiles | 4 | 0 | ⚠️ Refactoring souhaitable |
| Logique Métier | 3 | 1 | ⚠️ Vérifications requises |
| Data Model | 3 | 0 | ⚠️ Cleanup souhaitable |
| Formulaires | 2 | 0 | ✅ À vérifier |

**TOTAL**: 25 incohérences identifiées  
**Critiques**: 8  
**Action immédiate requise**: 11

---

## 🔄 PROCHAINES ÉTAPES

1. **Validation utilisateur**: Confirmer les priorités et décisions à prendre
2. **Corrections PRIORITÉ 1**: Sécuriser RLS (I-RLS-1, I-RLS-4, I-LOGIC-3)
3. **Corrections PRIORITÉ 2**: Résoudre incohérences fonctionnelles
4. **Refactoring**: Nettoyer dette technique
5. **Documentation**: Documenter décisions dans memories

---

**Audit réalisé par**: AI Lovable  
**Version du système**: V2.0 (post-refactor permissions)  
**État du projet**: Pré-production (audits en cours)
